  -- Fix inconsistent leave_assignment totals where carry-forward exists.
  -- This enforces:
  --   total_hours     = carried_forward_hours + allocated_hours
  --   remaining_hours = total_hours - used_hours
  --
  -- Run this once after deploying the backend fix.

  UPDATE leave_assignment
  SET
    total_hours = CAST(IFNULL(carried_forward_hours, 0) AS DECIMAL(18,3)) + CAST(IFNULL(allocated_hours, 0) AS DECIMAL(18,3)),
    remaining_hours = GREATEST(
      0,
      (CAST(IFNULL(carried_forward_hours, 0) AS DECIMAL(18,3)) + CAST(IFNULL(allocated_hours, 0) AS DECIMAL(18,3)))
        - CAST(IFNULL(used_hours, 0) AS DECIMAL(18,3))
    )
  WHERE
    (carried_forward_hours IS NOT NULL AND CAST(carried_forward_hours AS DECIMAL(18,3)) > 0)
    AND (
      CAST(IFNULL(total_hours, 0) AS DECIMAL(18,3)) <> (CAST(IFNULL(carried_forward_hours, 0) AS DECIMAL(18,3)) + CAST(IFNULL(allocated_hours, 0) AS DECIMAL(18,3)))
      OR CAST(IFNULL(remaining_hours, 0) AS DECIMAL(18,3)) <> GREATEST(
        0,
        (CAST(IFNULL(carried_forward_hours, 0) AS DECIMAL(18,3)) + CAST(IFNULL(allocated_hours, 0) AS DECIMAL(18,3)))
          - CAST(IFNULL(used_hours, 0) AS DECIMAL(18,3))
      )
    );

