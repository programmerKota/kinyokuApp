-- Convert challenges.id from text to uuid if necessary
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='challenges' AND column_name='id' AND data_type='text'
  ) THEN
    ALTER TABLE public.challenges
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE uuid USING id::uuid,
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add FK from diaries.challengeId -> challenges.id (both uuid)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='fk_diaries_challenge' AND table_name='diaries'
  ) THEN
    BEGIN
      ALTER TABLE public.diaries
        ADD CONSTRAINT fk_diaries_challenge FOREIGN KEY ("challengeId") REFERENCES public.challenges(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      -- ignore if types still incompatible; this will be revisited
      RAISE NOTICE 'fk_diaries_challenge not added: %', SQLERRM;
    END;
  END IF;
END $$;
