import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

export const claimChore = async (req: Request, res: Response): Promise<void> => {
  try {
    const choreId = parseInt(req.params.choreId);
    const { childId } = req.body;

    if (!childId) {
      res.status(400).json({ error: 'childId is required' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE chores 
       SET status = 'claimed', claimed_by = ?, claimed_at = NOW()
       WHERE id = ? AND status = 'available'`,
      [childId, choreId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Chore not found or already claimed' });
      return;
    }

    res.json({ message: 'Chore claimed successfully' });
  } catch (error) {
    console.error('Error claiming chore:', error);
    res.status(500).json({ error: 'Failed to claim chore' });
  }
};

export const completeChore = async (req: Request, res: Response): Promise<void> => {
  try {
    const choreId = parseInt(req.params.choreId);
    const { childId } = req.body;

    if (!childId) {
      res.status(400).json({ error: 'childId is required' });
      return;
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update chore status
      const [choreResult] = await connection.query<ResultSetHeader>(
        `UPDATE chores 
         SET status = 'completed', completed_at = NOW()
         WHERE id = ? AND claimed_by = ? AND status = 'claimed'`,
        [choreId, childId]
      );

      if (choreResult.affectedRows === 0) {
        await connection.rollback();
        res.status(404).json({ error: 'Chore not found or not claimed by this child' });
        return;
      }

      // Get chore credits
      const [chores] = await connection.query<any[]>(
        'SELECT credits FROM chores WHERE id = ?',
        [choreId]
      );

      if (chores.length === 0) {
        await connection.rollback();
        res.status(404).json({ error: 'Chore not found' });
        return;
      }

      const credits = chores[0].credits;

      // Award credits
      await connection.query(
        `INSERT INTO credits (child_id, chore_id, amount, earned_at)
         VALUES (?, ?, ?, NOW())`,
        [childId, choreId, credits]
      );

      await connection.commit();
      
      res.json({ 
        message: 'Chore completed successfully',
        creditsEarned: credits 
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error completing chore:', error);
    res.status(500).json({ error: 'Failed to complete chore' });
  }
};
