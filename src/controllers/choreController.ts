import { Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const completeChore = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const choreId = parseInt(req.params.choreId);
    const { child_id } = req.body;

    if (!child_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'child_id is required' });
    }

    const [chores] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM chores WHERE id = ? AND is_active = true',
      [choreId]
    );

    if (chores.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Chore not found' });
    }

    const chore = chores[0];

    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM chore_instances 
       WHERE chore_id = ? AND child_id = ? AND DATE(completed_at) = CURDATE()`,
      [choreId, child_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Chore already completed today' 
      });
    }

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO chore_instances (chore_id, child_id, completed_at, synced_at, due_date)
       VALUES (?, ?, NOW(), NOW(), CURDATE())`,
      [choreId, child_id]
    );

    const instanceId = result.insertId;
    let creditsEarned = 0;

    if (chore.type === 'optional' && chore.price > 0) {
      await connection.query(
        `INSERT INTO credits (child_id, amount, earned_from_chore_instance_id, status, period_end_date)
         VALUES (?, ?, ?, 'pending', CURDATE())`,
        [child_id, chore.price, instanceId]
      );

      await connection.query(
        'UPDATE children SET credit_balance = credit_balance + ? WHERE id = ?',
        [chore.price, child_id]
      );

      creditsEarned = parseFloat(chore.price.toString());
    }

    const [childData] = await connection.query<RowDataPacket[]>(
      'SELECT credit_balance FROM children WHERE id = ?',
      [child_id]
    );

    const newBalance = parseFloat(childData[0].credit_balance.toString());

    await connection.query(
      `INSERT INTO activity_log (household_id, child_id, action_type, description)
       VALUES (?, ?, 'chore_completed', ?)`,
      [chore.household_id, child_id, `Completed: ${chore.title}`]
    );

    await connection.commit();

    res.json({
      success: true,
      newBalance,
      creditsEarned,
      message: 'Chore completed successfully!',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error completing chore:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete chore',
      message: error.message 
    });
  } finally {
    connection.release();
  }
};

export const claimChore = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const choreId = parseInt(req.params.choreId);
    const { child_id } = req.body;

    if (!child_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'child_id is required' });
    }

    const [chores] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM chores 
       WHERE id = ? AND assigned_to_child_id IS NULL AND is_active = true`,
      [choreId]
    );

    if (chores.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Chore not available or already claimed' 
      });
    }

    const chore = chores[0];

    await connection.query(
      'UPDATE chores SET assigned_to_child_id = ? WHERE id = ?',
      [child_id, choreId]
    );

    await connection.query(
      `INSERT INTO activity_log (household_id, child_id, action_type, description)
       VALUES (?, ?, 'chore_claimed', ?)`,
      [chore.household_id, child_id, `Claimed: ${chore.title}`]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Chore claimed successfully!',
      chore: {
        id: chore.id,
        title: chore.title,
        price: parseFloat(chore.price.toString()),
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error claiming chore:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to claim chore',
      message: error.message 
    });
  } finally {
    connection.release();
  }
};