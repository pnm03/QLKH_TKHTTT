-- Create payments table
CREATE TABLE public.payments (
  payment_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  payment_method_name text NOT NULL,
  description text,
  image text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Enable read access for all users" ON public.payments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for owners" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for owners" ON public.payments
  FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();
