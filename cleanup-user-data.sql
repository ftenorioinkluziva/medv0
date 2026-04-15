-- Script para limpar documentos e análises do usuário
-- User ID: 50ee8bd1-688c-4baa-a257-f62072820b83

-- Deletar análises individuais (dependem de livingAnalysisVersions e completeAnalyses)
DELETE FROM analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';

-- Deletar versões de living analysis (dependem de livingAnalyses)
DELETE FROM living_analysis_versions 
WHERE living_analysis_id IN (
  SELECT id FROM living_analyses 
  WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83'
);

-- Deletar living analyses
DELETE FROM living_analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';

-- Deletar complete analyses (deprecated)
DELETE FROM complete_analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';

-- Deletar snapshots (dependem de documents)
DELETE FROM snapshots 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';

-- Deletar documents
DELETE FROM documents 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';

-- Verificar resultado
SELECT 
  'documents' AS table_name, COUNT(*) as remaining 
FROM documents 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83'
UNION ALL
SELECT 
  'snapshots', COUNT(*) 
FROM snapshots 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83'
UNION ALL
SELECT 
  'analyses', COUNT(*) 
FROM analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83'
UNION ALL
SELECT 
  'living_analyses', COUNT(*) 
FROM living_analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83'
UNION ALL
SELECT 
  'complete_analyses', COUNT(*) 
FROM complete_analyses 
WHERE user_id = '50ee8bd1-688c-4baa-a257-f62072820b83';
