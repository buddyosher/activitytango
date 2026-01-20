export interface Child {
  id: number;
  household_id: number;
  name: string;
  avatar_url: string | null;
  color_theme: string;
  credit_balance: number;
  completion_rate: number;
  total_earned: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Chore {
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  type: 'mandatory' | 'optional';
  recurrence: 'daily' | 'weekly' | 'manual';
  price: number;
  assigned_to_child_id: number | null;
  deadline_time: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ChoreInstance {
  id: number;
  chore_id: number;
  child_id: number | null;
  due_date: Date | null;
  completed_at: Date | null;
  synced_at: Date | null;
  is_carried_over: boolean;
  created_at: Date;
}

export interface Credit {
  id: number;
  child_id: number;
  amount: number;
  earned_from_chore_instance_id: number | null;
  status: 'pending' | 'paid';
  period_end_date: Date | null;
  paid_at: Date | null;
  payment_method: string | null;
  notes: string | null;
  created_at: Date;
}