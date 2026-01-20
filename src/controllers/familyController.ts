import { Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export const getFamilyDashboard = async (req: Request, res: Response) => {
  try {
    const householdId = req.query.household_id || process.env.HOUSEHOLD_ID || 1;

    const [children] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, avatar_url, color_theme, credit_balance 
       FROM children 
       WHERE household_id = ? AND is_active = true
       ORDER BY name`,
      [householdId]
    );

    const childrenWithChores = await Promise.all(
      children.map(async (child) => {
        const [assignedChores] = await pool.query<RowDataPacket[]>(
          `SELECT c.*, db.carry_over, db.send_reminders, db.lock_optional, db.reminder_hours_before
           FROM chores c
           LEFT JOIN deadline_behaviors db ON c.id = db.chore_id
           WHERE c.assigned_to_child_id = ? AND c.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM chore_instances ci 
             WHERE ci.chore_id = c.id 
             AND ci.child_id = ? 
             AND DATE(ci.completed_at) = CURDATE()
           )
           ORDER BY c.deadline_time ASC`,
          [child.id, child.id]
        );

        const [completedToday] = await pool.query<RowDataPacket[]>(
          `SELECT ci.*, c.title, c.type, c.price
           FROM chore_instances ci
           JOIN chores c ON ci.chore_id = c.id
           WHERE ci.child_id = ? 
           AND DATE(ci.completed_at) = CURDATE()
           ORDER BY ci.completed_at DESC`,
          [child.id]
        );

        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar_url,
          colorTheme: child.color_theme,
          creditBalance: parseFloat(child.credit_balance.toString()),
          assignedChores: assignedChores.map(chore => ({
            id: chore.id,
            title: chore.title,
            description: chore.description,
            type: chore.type,
            deadline: chore.deadline_time,
            price: chore.price ? parseFloat(chore.price.toString()) : undefined,
            status: 'incomplete',
          })),
          completedChores: completedToday.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            completedAt: item.completed_at,
            creditsEarned: item.price ? parseFloat(item.price.toString()) : 0,
          })),
        };
      })
    );

    const [openChores] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM chores 
       WHERE household_id = ? 
       AND assigned_to_child_id IS NULL 
       AND type = 'optional' 
       AND is_active = true
       ORDER BY price DESC`,
      [householdId]
    );

    res.json({
      success: true,
      children: childrenWithChores,
      openChores: openChores.map(chore => ({
        id: chore.id,
        title: chore.title,
        description: chore.description,
        price: parseFloat(chore.price.toString()),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching family dashboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data',
      message: error.message 
    });
  }
};