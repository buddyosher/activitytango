import { Request, Response } from 'express';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';

interface Child extends RowDataPacket {
  id: number;
  name: string;
  age: number;
  avatar_url: string;
  total_credits: number;
}

interface Chore extends RowDataPacket {
  id: number;
  title: string;
  description: string;
  credits: number;
  status: string;
  claimed_by: number | null;
  claimed_by_name: string | null;
}

export const getFamilyDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = parseInt(req.params.householdId || '1');

    // Get children
    const [children] = await pool.query<Child[]>(
      `SELECT c.id, c.name, c.age, c.avatar_url,
              COALESCE(SUM(cr.amount), 0) as total_credits
       FROM children c
       LEFT JOIN credits cr ON c.id = cr.child_id
       WHERE c.household_id = ?
       GROUP BY c.id`,
      [householdId]
    );

    // Get available chores
    const [chores] = await pool.query<Chore[]>(
      `SELECT ch.id, ch.title, ch.description, ch.credits, ch.status,
              ch.claimed_by, c.name as claimed_by_name
       FROM chores ch
       LEFT JOIN children c ON ch.claimed_by = c.id
       WHERE ch.household_id = ? AND ch.status IN ('available', 'claimed')
       ORDER BY ch.created_at DESC`,
      [householdId]
    );

    res.json({
      children,
      chores
    });
  } catch (error) {
    console.error('Error fetching family dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch family dashboard' });
  }
};
