-- ============================================================
-- Dummy Seed Data — Academic Factory 기능 테스트용
-- ============================================================
-- 연구 주제: Foundation Model 기반 NIR 스펙트럼 분석
-- (식품 품질 분석에 머신러닝을 적용하는 연구 시나리오)
--
-- 전제 조건: schema.sql + migration-v3 ~ v5 실행 완료
--
-- 삭제 방법:
--   DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000001';
--   (journals, assets 별도 삭제 필요 — 아래 seed-dummy-delete.sql 사용)
-- ============================================================

-- ── 1. Project ───────────────────────────────────────────

INSERT INTO projects (id, name, description, research_intent, status, tags)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '[테스트] NIR 스펙트럼 AI 분석 프레임워크',
  'Foundation Model의 zero-shot 전이 능력을 근적외선 스펙트럼 분류에 적용하는 연구 프로젝트 (더미 데이터)',
  'Foundation Model의 zero-shot 전이학습 능력을 근적외선(NIR) 스펙트럼 분류 문제에 최초 적용하여, 기존 PLS·SVM calibration 기반 방법 대비 데이터 효율성과 범용성을 실험적으로 입증한다.',
  'active',
  '{NIR,ML,FoundationModel,Spectroscopy}'
);

-- ── 2. Tracks (3개 — 각기 다른 진행 단계) ───────────────

INSERT INTO tracks (
  id, project_id, name, description, research_intent,
  color, status, current_stage,
  experiment_start_date, target_submit_date, context_log, tags
) VALUES

-- Track 1: 실험 설계 단계
(
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Transformer 기반 스펙트럼 분류',
  'Vision Transformer를 1D NIR 스펙트럼에 적용해 PLS/SVM 대비 성능 비교',
  'Vision Transformer 계열 모델을 NIR 스펙트럼 데이터에 fine-tuning하여 소량 데이터 환경에서도 기존 계량화학 방법 대비 우수한 분류 성능을 입증한다.',
  '#6366f1', 'active', 'experiment_design',
  '2025-03-01', '2025-09-30',
  '[
    {"timestamp":"2025-01-10T09:00:00Z","stage":"hypothesis","note":"ResNet vs Transformer 비교 가설 초안 완료","by":"human"},
    {"timestamp":"2025-01-20T14:00:00Z","stage":"experiment_design","note":"ViT-Small 베이스라인 확정, 비교 모델 3종 선정","by":"human"}
  ]'::jsonb,
  '{Transformer,NIR,Classification}'
),

-- Track 2: 검증 단계 (실험 완료, 데이터 분석 중)
(
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '합성 데이터 증강 전략 비교',
  'GAN·VAE 기반 합성 스펙트럼 생성으로 소량 데이터 문제 해결',
  'GAN·VAE 기반 합성 스펙트럼 생성 방법이 실제 측정 데이터 대비 20% 이상의 분류 정확도 향상을 가져올 수 있음을 소량 데이터셋에서 검증한다.',
  '#f59e0b', 'active', 'validation',
  '2024-11-01', '2025-06-30',
  '[
    {"timestamp":"2024-11-15T10:00:00Z","stage":"experiment_design","note":"VAE vs DCGAN 비교 실험 설계 완료","by":"human"},
    {"timestamp":"2025-01-05T11:00:00Z","stage":"experiment","note":"1차 실험 완료: VAE가 DCGAN 대비 스펙트럼 품질 우수","by":"human"},
    {"timestamp":"2025-01-25T15:00:00Z","stage":"validation","note":"통계 검정 p<0.01 유의미, 논문화 결정","by":"human"}
  ]'::jsonb,
  '{DataAugmentation,GAN,VAE}'
),

-- Track 3: 초고 작성 단계 (가장 많이 진행된 트랙)
(
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Few-shot Learning 적용 효율 분석',
  '5-shot 이하로 새로운 화학물질 분류에 적응하는 메타러닝 접근법',
  'Prototypical Network 기반 few-shot learning이 NIR 스펙트럼 도메인에서 5개 샘플만으로 새로운 물질 분류에 80% 이상의 정확도를 달성함을 실험적으로 입증한다.',
  '#10b981', 'active', 'draft',
  '2024-09-01', '2025-05-31',
  '[
    {"timestamp":"2024-09-10T09:00:00Z","stage":"hypothesis","note":"Prototypical Network 적용 가설 수립","by":"human"},
    {"timestamp":"2024-10-20T14:00:00Z","stage":"experiment","note":"NIST NIR 데이터셋 1차 실험 완료, 83.2% 달성","by":"human"},
    {"timestamp":"2024-11-30T10:00:00Z","stage":"backup_design","note":"추가 chemical class 5종 검증 설계","by":"human"},
    {"timestamp":"2025-01-10T16:00:00Z","stage":"draft","note":"초고 작성 시작, Analytical Chemistry 타겟","by":"human"}
  ]'::jsonb,
  '{FewShot,MetaLearning,NIR}'
);

-- ── 3. Reference Papers (10편 — T1/T2/T3 혼합) ──────────

INSERT INTO reference_papers (
  id, project_id, title, authors, journal, year, doi,
  abstract, notes, status, tier, tags
) VALUES

-- T1: 경쟁 논문 (3편)
(
  '00000000-0000-0000-0002-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Spectral Transformer: Self-Attention for Near-Infrared Spectroscopy Classification',
  ARRAY['Zhang, W.','Liu, H.','Chen, X.'],
  'Analytical Chemistry', 2023,
  '10.1021/acs.analchem.3c01234',
  'We present SpectralTransformer, a novel self-attention architecture for 1D spectral data. Achieves 94.7% accuracy on NIR food quality datasets, outperforming PLS-DA and SVM by 12% with only 200 training samples.',
  '핵심 경쟁 논문. Transformer를 1D 스펙트럼에 적용했으나 zero-shot 전이는 미검증. 우리 차별점: 전이학습 범용성.',
  'key', 1, '{Transformer,NIR,T1,Competing}'
),
(
  '00000000-0000-0000-0002-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Few-Shot Learning for Rapid Identification of NIR Spectra from Novel Compounds',
  ARRAY['Kim, J.','Park, S.'],
  'Analytical Chemistry', 2024,
  '10.1021/acs.analchem.4c00567',
  'Prototypical network approach applied to NIR spectral classification. Identifies novel compounds with as few as 3 reference spectra. 81.3% accuracy in 3-shot pharmaceutical NIR setting.',
  '직접 경쟁 논문 (Track 3). 도메인이 pharmaceutical로 한정. 우리는 식품+화학 복합 도메인으로 확장.',
  'key', 1, '{FewShot,NIR,Pharmaceutical,T1,Competing}'
),
(
  '00000000-0000-0000-0002-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Data Augmentation Strategies for Vibrational Spectroscopy using Generative Models',
  ARRAY['Müller, A.','Schmidt, K.','Weber, M.'],
  'TrAC Trends in Analytical Chemistry', 2024,
  '10.1016/j.trac.2024.117123',
  'Benchmark of GAN, VAE, and diffusion model-based data augmentation for Raman and NIR spectroscopy. Shows up to 18% accuracy improvement with synthetic augmentation in low-data regimes.',
  'T1 경쟁 (Track 2). 데이터 증강 최신 벤치마크. 우리 차별점: Foundation Model과의 시너지 검증.',
  'key', 1, '{DataAugmentation,GAN,T1,Competing}'
),

-- T2: 핵심 근거 논문 (5편)
(
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
  ARRAY['Dosovitskiy, A.','Beyer, L.','Kolesnikov, A.'],
  'ICLR', 2021,
  '10.48550/arXiv.2010.11929',
  'Pure transformer applied to sequences of image patches achieves excellent results on image classification. ViT pre-trained on large data and transferred to mid-sized benchmarks outperforms CNNs.',
  'ViT 원논문. Transformer 기반 분류의 핵심 근거. 1D 스펙트럼 패치 적용 방식 영감 출처.',
  'key', 2, '{ViT,Transformer,Foundation,T2}'
),
(
  '00000000-0000-0000-0002-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Prototypical Networks for Few-shot Learning',
  ARRAY['Snell, J.','Swersky, K.','Zemel, R.'],
  'NeurIPS', 2017,
  '10.48550/arXiv.1703.05175',
  'Prototypical Networks represent each class by the mean embedding of support set examples. Classification finds the nearest prototype in embedding space.',
  'Few-shot 방법론 핵심 근거. Track 3의 이론적 기반.',
  'key', 2, '{FewShot,MetaLearning,T2}'
),
(
  '00000000-0000-0000-0002-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Conditional GAN for Spectral Data Augmentation in Chemometrics',
  ARRAY['Li, Z.','Wang, Q.'],
  'Journal of Chemometrics', 2023,
  '10.1002/cem.3456',
  'cGAN generates realistic NIR spectra conditioned on chemical composition labels. 15% downstream classification accuracy gain with 50-sample training sets.',
  'GAN 기반 스펙트럼 증강 핵심 참고. Track 2 방법론 근거.',
  'key', 2, '{GAN,DataAugmentation,NIR,T2}'
),
(
  '00000000-0000-0000-0002-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Near-infrared spectroscopy in food quality assessment: A comprehensive review',
  ARRAY['Cen, H.','He, Y.'],
  'TrAC Trends in Analytical Chemistry', 2007,
  '10.1016/j.trac.2007.06.012',
  'Comprehensive review of NIR spectroscopy applications in food quality and safety assessment, covering instrumentation, chemometric methods, and practical applications.',
  '식품 NIR 분야 표준 리뷰. 서론 배경 작성 필수 참고.',
  'read', 2, '{NIR,FoodQuality,Review,T2}'
),
(
  '00000000-0000-0000-0002-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
  ARRAY['Devlin, J.','Chang, M.W.','Lee, K.'],
  'NAACL', 2019,
  '10.18653/v1/N19-1423',
  'BERT pre-trains deep bidirectional representations from unlabeled text. Fine-tuning achieves state-of-the-art on 11 NLP benchmarks without task-specific architecture changes.',
  'Foundation Model 패러다임 핵심 근거. 전이학습 효과성 논거. 스펙트럼 도메인 확장 이론적 배경.',
  'read', 2, '{Foundation,Pretraining,T2}'
),

-- T3: 배경·거시 문헌 (2편)
(
  '00000000-0000-0000-0002-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'Machine learning in analytical chemistry: An introductory overview',
  ARRAY['Brereton, R.G.'],
  'Chemometrics and Intelligent Laboratory Systems', 2022,
  '10.1016/j.chemolab.2022.104577',
  'Overview of machine learning methods in analytical chemistry: supervised/unsupervised methods, neural networks, spectroscopy and chromatography applications.',
  '분석화학 + ML 분야 배경 서술. 서론 도입부.',
  'read', 3, '{ML,AnalyticalChemistry,Survey,T3}'
),
(
  '00000000-0000-0000-0002-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Chemometrics in food analysis',
  ARRAY['Granato, D.','Santos, J.S.'],
  'Food Research International', 2021,
  '10.1016/j.foodres.2021.110610',
  'Review of chemometric methods in food analysis including PCA, PLS, neural networks for quality control and authenticity verification.',
  '계량화학 전통 방법론 배경. PLS 기준선 비교 시 인용.',
  'unread', 3, '{Chemometrics,Food,PLS,T3}'
);

-- ── 4. Journals (4개 — shortlisted 2, considering 2) ─────

INSERT INTO journals (
  id, project_id, name, publisher, issn, impact_factor,
  scope, website, submission_url, status, notes, tags, track_analyses
) VALUES

(
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Analytical Chemistry',
  'American Chemical Society (ACS)',
  '1520-6882', 8.008,
  '분석화학 분야의 새로운 측정 원리, 방법론, 기기, 응용을 다룬다. 머신러닝과 데이터 분석의 분석화학 적용 포함. 실험적 검증과 실용적 적용을 강조한다.',
  'https://pubs.acs.org/journal/ancham',
  'https://pubs.acs.org/journal/ancham#author-information',
  'shortlisted',
  '주 투고 후보 1. T1 경쟁 논문 Zhang 2023 게재됨. IF 8.0 접근 가능. 실험 데이터 기반 논문에 적합. Page limit: 10 pages + SI.',
  '{ACS,AnalyticalChemistry,Shortlisted}',
  '[
    {"track_id":"00000000-0000-0000-0001-000000000001","track_name":"Transformer 기반 스펙트럼 분류","track_color":"#6366f1","fit_level":"optimal","fit_reason":"분석화학 분야의 머신러닝 응용 연구가 이 저널의 핵심 범주에 정확히 해당합니다. Transformer를 스펙트럼 분류에 적용한 신규 방법론 논문은 실험적 검증을 중시하는 Analytical Chemistry에 높은 적합도를 보입니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000002","track_name":"합성 데이터 증강 전략 비교","track_color":"#f59e0b","fit_level":"adequate","fit_reason":"합성 데이터 증강 방법론이 분석화학 문제에 적용된 점은 긍정적이나, 저널이 요구하는 분석 방법론 자체의 혁신성을 더 강조해야 합니다. 화학적 해석 가능성 섹션을 보강하면 게재 가능성이 높아집니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000003","track_name":"Few-shot Learning 적용 효율 분석","track_color":"#10b981","fit_level":"optimal","fit_reason":"Few-shot learning의 NIR 스펙트럼 도메인 적용은 Analytical Chemistry의 혁신적 방법론 논문 카테고리에 잘 맞습니다. 실험적 검증과 실용적 응용 가능성을 명확히 제시하면 높은 점수를 받을 수 있습니다.","analyzed_at":"2025-01-15T10:00:00Z"}
  ]'::jsonb
),

(
  '00000000-0000-0000-0003-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TrAC Trends in Analytical Chemistry',
  'Elsevier',
  '0165-9936', 14.0,
  '분석화학 분야의 최신 트렌드, 개발 동향, 기술 리뷰를 다루는 고영향력 저널. 분야 전체를 조망하는 critical review와 tutorial review를 주로 게재한다.',
  'https://www.sciencedirect.com/journal/trac-trends-in-analytical-chemistry',
  NULL,
  'shortlisted',
  '주 투고 후보 2. IF 14.0 고영향력. 리뷰 성격 논문 선호 — 단일 실험 논문보다 분야 전체 조망 방향 필요. Track 1 논문을 리뷰 형태로 확장 시 적합.',
  '{Elsevier,Review,HighIF,Shortlisted}',
  '[
    {"track_id":"00000000-0000-0000-0001-000000000001","track_name":"Transformer 기반 스펙트럼 분류","track_color":"#6366f1","fit_level":"adequate","fit_reason":"고영향력 저널로 연구 범위는 부합하나, TrAC는 주로 리뷰 성격 논문을 게재합니다. Transformer 계열 전체를 분광 분야에서 조망하는 방향으로 확장하면 적합도가 높아집니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000002","track_name":"합성 데이터 증강 전략 비교","track_color":"#f59e0b","fit_level":"insufficient","fit_reason":"데이터 증강 방법론 비교 실험 논문은 TrAC의 트렌드 리뷰 형식과 맞지 않습니다. 분야 전체 동향을 포괄하는 방향으로 크게 확장하지 않으면 scope 불일치로 거절 가능성이 높습니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000003","track_name":"Few-shot Learning 적용 효율 분析","track_color":"#10b981","fit_level":"adequate","fit_reason":"Few-shot learning의 분석화학 적용 트렌드를 다루는 방향이라면 게재 가능성 있습니다. 단, 단일 방법론 비교보다 meta-learning 계열 전체의 분광 도메인 적용을 리뷰하는 구성이 필요합니다.","analyzed_at":"2025-01-15T10:00:00Z"}
  ]'::jsonb
),

(
  '00000000-0000-0000-0003-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Journal of Chemometrics',
  'Wiley',
  '1099-128X', 3.456,
  '계량화학 방법론 개발과 응용을 다루는 전문 저널. 스펙트럼 데이터 처리, 다변량 분석, 패턴 인식, 머신러닝의 화학 측정 적용 포함.',
  'https://analyticalsciencejournals.onlinelibrary.wiley.com/journal/1099128x',
  NULL,
  'considering',
  'IF 낮지만 타겟 독자(계량화학자)에게 직접 도달. T1 경쟁 논문 없음 — 선점 기회. 방법론 논문 친화적.',
  '{Wiley,Chemometrics,Methodology}',
  '[
    {"track_id":"00000000-0000-0000-0001-000000000001","track_name":"Transformer 기반 스펙트럼 분류","track_color":"#6366f1","fit_level":"optimal","fit_reason":"계량화학 저널로 스펙트럼+머신러닝 조합이 정확히 핵심 독자층 관심사입니다. IF는 낮지만 타겟 독자에게 직접 도달하며, T1 경쟁 논문이 없어 선점 기회가 있습니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000002","track_name":"합성 데이터 증강 전략 비교","track_color":"#f59e0b","fit_level":"optimal","fit_reason":"데이터 증강과 계량화학 방법론 비교는 이 저널의 핵심 독자층에 매우 적합합니다. 방법론적 엄밀성과 벤치마크 비교가 잘 갖춰지면 게재 가능성이 매우 높습니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000003","track_name":"Few-shot Learning 적용 효율 분析","track_color":"#10b981","fit_level":"adequate","fit_reason":"Few-shot learning의 계량화학 적용은 신선한 주제이나, 방법론 검증 실험이 chemometrics 관점에서 충분히 제시되어야 합니다. 통계적 유의성 분석 강화가 필요합니다.","analyzed_at":"2025-01-15T10:00:00Z"}
  ]'::jsonb
),

(
  '00000000-0000-0000-0003-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Food Chemistry',
  'Elsevier',
  '0308-8146', 9.231,
  '식품의 화학적 조성, 품질 분석, 가공 영향을 다루는 응용 저널. 식품 안전, 진위 확인, 품질 관리에서의 분석 방법론 포함.',
  'https://www.sciencedirect.com/journal/food-chemistry',
  NULL,
  'considering',
  '식품 NIR 응용 각도로 접근 가능. IF 9.2 준수. 단, 방법론 중심보다 식품 응용 결과 중심 포지셔닝 필요.',
  '{Elsevier,FoodScience,Applied}',
  '[
    {"track_id":"00000000-0000-0000-0001-000000000001","track_name":"Transformer 기반 스펙트럼 분류","track_color":"#6366f1","fit_level":"adequate","fit_reason":"식품 품질 분석에 적용된 NIR 분류라면 게재 가능합니다. 단, 방법론 혁신보다 식품 분석 응용 결과와 실용성을 논문의 중심으로 재구성해야 합니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000002","track_name":"합성 데이터 증강 전략 비교","track_color":"#f59e0b","fit_level":"insufficient","fit_reason":"데이터 증강 방법론 비교 자체는 Food Chemistry의 응용 중심 성격과 맞지 않습니다. 식품 품질 관리에서의 실질적 개선 효과를 중심으로 완전히 재구성하지 않으면 scope 불일치입니다.","analyzed_at":"2025-01-15T10:00:00Z"},
    {"track_id":"00000000-0000-0000-0001-000000000003","track_name":"Few-shot Learning 적용 효율 분析","track_color":"#10b981","fit_level":"insufficient","fit_reason":"Few-shot learning 효율 분析 자체는 Food Chemistry 독자의 관심 범위를 벗어납니다. 식품 성분 분류에서의 빠른 적응 능력을 실용적 관점으로 다루지 않으면 게재가 어렵습니다.","analyzed_at":"2025-01-15T10:00:00Z"}
  ]'::jsonb
);

-- ── 5. Assets (8개 — 유형·섹션·출처 다양하게) ─────────────

INSERT INTO assets (
  id, project_id, type, title, content, source,
  reference_paper_id, paper_section, tags
) VALUES

(
  '00000000-0000-0000-0004-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'quote',
  'SpectralTransformer 핵심 성능 수치 인용',
  '"Our model achieves 94.7% accuracy on NIR food quality datasets, outperforming PLS-DA and SVM baselines by 12% with only 200 training samples." — Zhang et al. (2023)',
  'Zhang et al. 2023, Analytical Chemistry',
  '00000000-0000-0000-0002-000000000001',
  'intro',
  '{T1,NIR,Transformer,Benchmark}'
),
(
  '00000000-0000-0000-0004-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'quote',
  'Prototypical Network 분류 원리 인용',
  '"Each class is represented by a prototype computed as the mean of its support set embeddings, and classification is performed by finding the nearest prototype in embedding space." — Snell et al. (2017)',
  'Snell et al. 2017, NeurIPS',
  '00000000-0000-0000-0002-000000000005',
  'methods',
  '{FewShot,PrototypicalNetwork,Methods}'
),
(
  '00000000-0000-0000-0004-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'data',
  '자체 실험 결과 — Few-shot 정확도 표',
  'NIST Chemistry WebBook NIR 데이터셋 (50종 화학물질, 물질당 20 스펙트럼)
  
  5-shot: 83.2% 분류 정확도
  3-shot: 74.8%
  1-shot: 61.3%
  SVM 5-shot 비교: 58.1%
  PLS-DA 5-shot 비교: 52.6%',
  '트랙 3 자체 실험 (2024-10)',
  NULL,
  'results',
  '{ExperimentalData,FewShot,Results}'
),
(
  '00000000-0000-0000-0004-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'quote',
  'GAN 증강 효과 수치 인용',
  '"cGAN-generated synthetic spectra improve downstream classification accuracy by 15% in 50-sample training sets, with FID score of 0.089 indicating high spectral fidelity." — Li & Wang (2023)',
  'Li & Wang 2023, Journal of Chemometrics',
  '00000000-0000-0000-0002-000000000006',
  'results',
  '{GAN,DataAugmentation,Benchmark}'
),
(
  '00000000-0000-0000-0004-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'note',
  '스펙트럼 전처리 프로토콜 메모',
  '논문 Methods 섹션 기술 기준:
  1. SNV (Standard Normal Variate) 정규화
  2. Savitzky-Golay 스무딩 (window=11, poly=2)
  3. 950-1650nm 범위 (water absorption 구간 제외)
  
  비교 알고리즘: PLS-DA (LVs=10), SVM-RBF (C=1, γ=auto)',
  '실험 설계 노트',
  NULL,
  'methods',
  '{Methods,Preprocessing,Protocol}'
),
(
  '00000000-0000-0000-0004-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'reference',
  'ViT 논문 인용 포맷',
  'Dosovitskiy, A., Beyer, L., Kolesnikov, A., et al. (2021). An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale. In International Conference on Learning Representations (ICLR 2021).',
  'ICLR 2021',
  '00000000-0000-0000-0002-000000000004',
  'methods',
  '{ViT,Reference,Transformer}'
),
(
  '00000000-0000-0000-0004-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'quote',
  'NIR 식품 분석 범위 배경 인용',
  '"NIR spectroscopy has emerged as a powerful tool for rapid, non-destructive assessment of food quality parameters including moisture, protein, and fat content, with analysis times under 60 seconds." — Cen & He (2007)',
  'Cen & He 2007, TrAC',
  '00000000-0000-0000-0002-000000000008',
  'intro',
  '{NIR,FoodQuality,Background,Intro}'
),
(
  '00000000-0000-0000-0004-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'note',
  '투고 전략 메모',
  '우선순위:
  1. Track 3 (Few-shot) → Analytical Chemistry 우선 투고 (5월 목표)
  2. Track 2 (데이터 증강) → Journal of Chemometrics (6월 목표)
  3. Track 1 (Transformer) → Analytical Chemistry 또는 TrAC 리뷰 논문 형태
  
  Track 3 accept 이후 Track 1을 TrAC에 리뷰 논문으로 확장 검토.',
  '전략 메모 2025-01',
  NULL, NULL,
  '{Strategy,Planning}'
);

-- ── 6. Hypotheses (4개 — 각기 다른 상태) ────────────────

INSERT INTO hypotheses (id, track_id, title, statement, rationale, status, tags)
VALUES

(
  '00000000-0000-0000-0005-000000000001',
  '00000000-0000-0000-0001-000000000001',
  'ViT 기반 모델의 NIR 분류 우위 가설',
  'Vision Transformer 기반 모델은 200개 미만의 학습 샘플에서 PLS-DA 및 SVM 대비 최소 10% 이상 높은 분류 정확도를 달성한다.',
  'SpectralTransformer(Zhang 2023)가 PLS-DA 대비 12% 향상을 보였으나, pre-training 없는 scratch 학습과 fine-tuning을 구분하지 않았다. 전이학습 효과를 분리 검증하면 더 높은 성능 달성 가능.',
  'active',
  '{ViT,NIR,Transfer}'
),
(
  '00000000-0000-0000-0005-000000000002',
  '00000000-0000-0000-0001-000000000001',
  'Zero-shot 전이 가능성 가설',
  '동일 도메인(식품 NIR)에서 pre-training된 Foundation Model은 새로운 화학물질 클래스에 대해 fine-tuning 없이 60% 이상의 분류 정확도를 달성한다.',
  'BERT/GPT에서 입증된 zero-shot 전이 능력이 1D 스펙트럼 도메인에도 적용 가능하다는 가설. 현재 문헌에서 스펙트럼 도메인 zero-shot은 미검증.',
  'draft',
  '{ZeroShot,Foundation,Transfer}'
),
(
  '00000000-0000-0000-0005-000000000003',
  '00000000-0000-0000-0001-000000000002',
  'VAE 기반 증강의 분류 정확도 향상 가설',
  'VAE로 생성한 합성 NIR 스펙트럼을 학습 데이터에 추가하면 50개 미만의 실제 샘플 환경에서 분류 정확도가 20% 이상 향상된다.',
  'Li & Wang 2023이 cGAN으로 15% 향상을 보였고, VAE는 latent space 제어가 더 용이해 더 높은 향상 기대. 실험 결과 VAE 22.3% 향상 확인.',
  'confirmed',
  '{VAE,DataAugmentation,Validated}'
),
(
  '00000000-0000-0000-0005-000000000004',
  '00000000-0000-0000-0001-000000000003',
  'Prototypical Network 5-shot NIR 분류 가설',
  'Prototypical Network 기반 few-shot learning은 NIR 스펙트럼에서 5개 참조 샘플만으로 새로운 화학물질 클래스 분류에 80% 이상의 정확도를 달성한다.',
  'Snell 2017의 이미지 도메인 결과(76.1% 5-shot)를 스펙트럼 도메인에서 검증. 실험 결과 83.2% 달성 — 이미지 도메인 초과.',
  'testing',
  '{FewShot,Prototypical,NIR}'
);

-- ── 7. Drafts (1개 — Track 3, revising 상태) ─────────────

INSERT INTO drafts (id, track_id, journal_id, title, abstract, body, status, word_count, notes, tags)
VALUES (
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0003-000000000001',
  'Few-Shot Classification of NIR Spectra Using Prototypical Networks',
  'We present a few-shot learning approach based on prototypical networks for rapid classification of near-infrared (NIR) spectra from novel chemical compounds. Our method achieves 83.2% classification accuracy in 5-shot settings on the NIST NIR dataset, outperforming SVM and PLS-DA baselines by 25.1 and 30.6 percentage points respectively. The proposed approach requires minimal labeled data and adapts to new compound classes without retraining, addressing the key bottleneck of calibration-intensive traditional chemometric methods.',
  '1. Introduction
NIR spectroscopy is widely used for rapid, non-destructive analysis...
[서론 초안 작성 중]

2. Methods
We adopt the Prototypical Network framework (Snell et al., 2017)...
[방법론 섹션 완성됨]

3. Results and Discussion
Table 1 shows classification accuracy across shot settings...
[결과 섹션 초안, 추가 실험 데이터 보강 필요]

4. Conclusion
[미작성]',
  'revising', 4820,
  'Revision 1: Reviewer #1 critical 피드백(데이터셋 규모) 해결 중. NIST 외 2개 데이터셋 추가 검증 실험 설계 필요.',
  '{FewShot,NIR,AnalyticalChemistry}'
);

-- ── 8. Figures (3개 — 각기 다른 상태) ───────────────────

INSERT INTO figures (id, track_id, draft_id, title, type, caption, description, status, tags)
VALUES

(
  '00000000-0000-0000-0007-000000000001',
  '00000000-0000-0000-0001-000000000002',
  NULL,
  '데이터 증강 방법별 성능 비교 (Final)',
  'chart',
  'Figure 1. Classification accuracy of four data augmentation strategies (no augmentation, SMOTE, cGAN, VAE) at varying training set sizes. Error bars: ±1 SD, 10-fold CV.',
  'x축: training set size (n=10,25,50,100), y축: accuracy. VAE가 n=50에서 최고 성능. 4개 방법론 grouped bar chart.',
  'final',
  '{DataAugmentation,Comparison,Final}'
),
(
  '00000000-0000-0000-0007-000000000002',
  '00000000-0000-0000-0001-000000000002',
  NULL,
  'VAE 생성 스펙트럼 vs 실제 스펙트럼 비교',
  'graph',
  'Figure 2. Representative NIR spectra: real measured (solid) vs VAE-generated synthetic (dashed) for three chemical compounds. Shaded regions: ±1 SD across 20 replicates.',
  '950-1650nm 파장 범위. 실제 vs 합성 스펙트럼 시각적 유사도. 3개 화합물 대표 예시.',
  'draft',
  '{VAE,Spectrum,Visualization}'
),
(
  '00000000-0000-0000-0007-000000000003',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0006-000000000001',
  'Few-shot 프레임워크 개요도 (Planned)',
  'diagram',
  'Figure 1. Overview of the proposed few-shot NIR classification framework. Support spectra are encoded via feature extractor, class prototypes computed as mean embeddings, and query spectra classified by nearest prototype distance.',
  '전체 방법론 구조 다이어그램: Support set → Encoder → Prototype 계산 → Query 분류. 논문 Figure 1 예정.',
  'planned',
  '{FewShot,Framework,Diagram}'
);

-- ── 9. Reviews (3개 — Track 3 초고에 대한 리뷰) ──────────

INSERT INTO reviews (id, draft_id, track_id, persona, feedback, severity, category, resolved, tags)
VALUES

(
  '00000000-0000-0000-0008-000000000001',
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0001-000000000003',
  '계량화학 전문 리뷰어 (데이터 중심)',
  '실험에 사용된 데이터셋이 NIST 하나뿐이며 총 50종 화학물질은 방법론의 범용성을 주장하기에 불충분합니다. 최소 3개 이상의 독립 데이터셋에서 검증해야 하며, 특히 식품 성분과 제약 성분을 포함한 다양한 도메인에서의 성능을 보여야 합니다.',
  'critical', 'data', false,
  '{DataSize,Validation,Unresolved}'
),
(
  '00000000-0000-0000-0008-000000000002',
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0001-000000000003',
  'ML 전문 리뷰어',
  'Prototypical Network이 NIR 스펙트럼 도메인에서 왜 효과적인지 이론적 설명이 부족합니다. Euclidean distance가 스펙트럼 공간에서 적절한 메트릭인 이유, pre-training 없이 feature extractor가 유효한 embedding을 생성하는 이유를 설명해야 합니다.',
  'major', 'methodology', true,
  '{Theory,Methodology,Resolved}'
),
(
  '00000000-0000-0000-0008-000000000003',
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0001-000000000003',
  '분석화학 리뷰어 (실용 응용 전공)',
  'Abstract와 Introduction에서 기존 calibration 방법의 한계를 지나치게 부정적으로 기술하고 있습니다. PLS-DA가 현업에서 표준 방법인 이유를 인정하고, 제안 방법이 보완적임을 강조하는 방향이 더 수용적입니다.',
  'minor', 'clarity', true,
  '{Writing,Tone,Resolved}'
);
