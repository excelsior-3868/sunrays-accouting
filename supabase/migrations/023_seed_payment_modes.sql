
-- Seed Payment Modes as Asset GL Heads
INSERT INTO gl_heads (name, type)
SELECT 'Cash in Hand', 'Asset'
WHERE NOT EXISTS (SELECT 1 FROM gl_heads WHERE name = 'Cash in Hand');

INSERT INTO gl_heads (name, type)
SELECT 'Petty Cash', 'Asset'
WHERE NOT EXISTS (SELECT 1 FROM gl_heads WHERE name = 'Petty Cash');

INSERT INTO gl_heads (name, type)
SELECT 'Bank Account', 'Asset'
WHERE NOT EXISTS (SELECT 1 FROM gl_heads WHERE name = 'Bank Account');

INSERT INTO gl_heads (name, type)
SELECT 'Digital Payment', 'Asset'
WHERE NOT EXISTS (SELECT 1 FROM gl_heads WHERE name = 'Digital Payment');

INSERT INTO gl_heads (name, type)
SELECT 'Cheque', 'Asset'
WHERE NOT EXISTS (SELECT 1 FROM gl_heads WHERE name = 'Cheque');
