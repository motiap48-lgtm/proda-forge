-- Create a unique partial index on brigade_members to prevent an operator from being in multiple brigades when active
CREATE UNIQUE INDEX IF NOT EXISTS idx_brigade_members_operator_active 
ON brigade_members (operator_id) 
WHERE is_active = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_brigade_members_operator_active IS 'Ensures an operator can only be an active member of one brigade at a time';