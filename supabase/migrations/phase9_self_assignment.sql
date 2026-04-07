-- Phase 9: Self-assignment source tracking
-- Adds a source column to assignments to distinguish coach-assigned, self-assigned, and AI-assigned plans.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'trainer';

COMMENT ON COLUMN assignments.source IS 'Origin of the assignment: trainer, self, or ai';
