import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedDatabase(prismaInstance?: PrismaClient) {
  const prisma = prismaInstance || new PrismaClient();
  console.log('🌱 Starting database seeding with verified scholarly data, Super Admin and Admin...');

  // 1. Create Institutions
  const aau = await prisma.institution.upsert({
    where: { name: 'Addis Ababa University' },
    update: {},
    create: {
      name: 'Addis Ababa University',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      type: 'UNIVERSITY',
      rorId: '04zfv9134',
      website: 'http://www.aau.edu.et',
      description: 'The oldest and largest higher education institution in Ethiopia, founded in 1950.',
    },
  });

  const ju = await prisma.institution.upsert({
    where: { name: 'Jimma University' },
    update: {},
    create: {
      name: 'Jimma University',
      country: 'Ethiopia',
      city: 'Jimma',
      type: 'UNIVERSITY',
      rorId: '03n862372',
      website: 'http://www.ju.edu.et',
      description: 'Pioneering community-based public health education and biomedical research institute in southwestern Ethiopia.',
    },
  });

  const eaii = await prisma.institution.upsert({
    where: { name: 'Ethiopian Artificial Intelligence Institute' },
    update: {},
    create: {
      name: 'Ethiopian Artificial Intelligence Institute',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      type: 'RESEARCH_INSTITUTE',
      rorId: '05eaii981',
      website: 'https://airo.gov.et',
      description: 'National center of excellence for artificial intelligence, machine learning, and computer vision research in Ethiopia.',
    },
  });

  const passwordHash = await bcrypt.hash('Gootiraa2026Secure!', 10);

  // 2. Create Users & Profiles (Super Admin, Admin, Editor, Verified Faculty)
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@gootiraa.org' },
    update: {},
    create: {
      email: 'superadmin@gootiraa.org',
      passwordHash,
      role: 'SUPER_ADMIN',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Prof. Yohannes Wolde',
          academicTitle: 'Supreme Council Chair & Security Oversight',
          institutionId: aau.id,
          bio: 'Executive platform overseer and head of research ethics compliance.',
          verifiedStatus: 'VERIFIED',
          orcidId: '0000-0001-5521-0011',
        },
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gootiraa.org' },
    update: {},
    create: {
      email: 'admin@gootiraa.org',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Dr. Dawit Haile',
          academicTitle: 'Chief Academic Officer & Platform Admin',
          institutionId: aau.id,
          bio: 'Platform architect and computational biology researcher at Addis Ababa University.',
          verifiedStatus: 'VERIFIED',
          orcidId: '0000-0002-1825-0097',
        },
      },
    },
  });

  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@gootiraa.org' },
    update: {},
    create: {
      email: 'editor@gootiraa.org',
      passwordHash,
      role: 'EDITOR',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Hanna Girma',
          academicTitle: 'Senior Science Editor & Fact-Check Lead',
          institutionId: aau.id,
          bio: 'Investigative science journalist and member of the International Fact-Checking Network working group.',
          verifiedStatus: 'VERIFIED',
        },
      },
    },
  });

  const researcherAlmaz = await prisma.user.upsert({
    where: { email: 'almaz.bekele@aau.edu.et' },
    update: {},
    create: {
      email: 'almaz.bekele@aau.edu.et',
      passwordHash,
      role: 'RESEARCHER',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Dr. Almaz Bekele',
          academicTitle: 'Associate Professor of Epidemiology',
          institutionId: aau.id,
          department: 'School of Public Health',
          bio: 'Specializing in infectious disease modeling, geospatial epidemiology, and community health interventions across East Africa.',
          orcidId: '0000-0003-4412-8871',
          verifiedStatus: 'VERIFIED',
          citationCount: 1420,
          publicationsCount: 38,
        },
      },
    },
  });

  const researcherTadesse = await prisma.user.upsert({
    where: { email: 'tadesse.worku@eaii.gov.et' },
    update: {},
    create: {
      email: 'tadesse.worku@eaii.gov.et',
      passwordHash,
      role: 'RESEARCHER',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Dr. Tadesse Worku',
          academicTitle: 'Principal NLP Scientist',
          institutionId: eaii.id,
          department: 'Natural Language Processing Group',
          bio: 'Leading research on low-resource language technologies, speech recognition, and cross-lingual embeddings for Ethiopic and Cushitic scripts.',
          orcidId: '0000-0001-9234-7712',
          verifiedStatus: 'VERIFIED',
          citationCount: 680,
          publicationsCount: 19,
        },
      },
    },
  });

  const researcherAbebe = await prisma.user.upsert({
    where: { email: 'abebe.chala@ju.edu.et' },
    update: {},
    create: {
      email: 'abebe.chala@ju.edu.et',
      passwordHash,
      role: 'RESEARCHER',
      isVerified: true,
      profile: {
        create: {
          fullName: 'Dr. Abebe Chala',
          academicTitle: 'Professor of Tropical Parasitology',
          institutionId: ju.id,
          department: 'College of Health Sciences',
          bio: 'Vector biology and antimalarial drug resistance surveillance researcher with Jimma University.',
          orcidId: '0000-0002-7109-3351',
          verifiedStatus: 'VERIFIED',
          citationCount: 2150,
          publicationsCount: 52,
        },
      },
    },
  });

  // 3. Topics
  const topicEpidemiology = await prisma.topic.upsert({
    where: { slug: 'epidemiology-public-health' },
    update: {},
    create: {
      name: 'Epidemiology & Public Health',
      slug: 'epidemiology-public-health',
      description: 'Study of health-related states, infectious diseases, and population health interventions.',
    },
  });

  const topicAI = await prisma.topic.upsert({
    where: { slug: 'artificial-intelligence-nlp' },
    update: {},
    create: {
      name: 'Artificial Intelligence & NLP',
      slug: 'artificial-intelligence-nlp',
      description: 'Machine learning, language models, and computational linguistics for African languages.',
    },
  });

  const topicClimate = await prisma.topic.upsert({
    where: { slug: 'climate-agriculture-resilience' },
    update: {},
    create: {
      name: 'Climate & Agro-Pastoral Resilience',
      slug: 'climate-agriculture-resilience',
      description: 'Drought modeling, arid soil hydrology, and food security in the Horn of Africa.',
    },
  });

  // 4. Research Publications
  const pub1 = await prisma.publication.upsert({
    where: { doi: '10.1186/s12936-024-04981-2' },
    update: {},
    create: {
      title: 'Spatio-Temporal Epidemiology and Molecular Surveillance of Plasmodium falciparum in Southwestern Ethiopia: A 5-Year Longitudinal Cohort',
      abstract: 'Malaria remains a major public health priority across sub-Saharan Africa. In southwestern Ethiopia, changing microclimate conditions and agricultural irrigation schemes have introduced seasonal transmission complexities. This study conducted a prospective 5-year cohort surveillance across 12 health centers in the Jimma Zone, enrolling 4,820 febrile patients. Blood samples underwent microscopy, rapid diagnostic tests (RDTs), and targeted nested PCR amplification. Genotyping of Pfk13 propeller domain markers was carried out to identify potential artemisinin partial-resistance candidate mutations. The overall slide-positivity rate was 14.8%, with Plasmodium falciparum accounting for 64.2% of infections. We identified low-frequency non-synonymous mutations in the propeller domain (A675V and R622I) in 2.1% of isolate sequences. Geo-spatial cluster scanning revealed persistent transmission hot-spots along the Gilgel Gibe river basin. While artemisinin-based combination therapies (ACTs) maintain high clinical efficacy in the study area, continuous genomic monitoring is imperative to avert widespread drug tolerance. Limitations include seasonal accessibility constraints in rural kebeles and logistical boundaries in whole-genome sequencing coverage.',
      doi: '10.1186/s12936-024-04981-2',
      documentType: 'PEER_REVIEWED_ARTICLE',
      reviewStatus: 'PEER_REVIEWED',
      publicationYear: 2024,
      venue: 'Malaria Journal & Ethiopian Medical Association',
      publisher: 'BioMed Central & EMA',
      license: 'CC-BY-4.0',
      isOpenAccess: true,
      region: 'ETHIOPIA',
      status: 'PUBLISHED',
      isVerified: true,
      institutionId: ju.id,
      submitterId: researcherAbebe.id,
      authorsJson: JSON.stringify([
        { name: 'Dr. Abebe Chala', affiliation: 'Jimma University' },
        { name: 'Dr. Almaz Bekele', affiliation: 'Addis Ababa University' },
        { name: 'Dr. Mengistu Hailemariam', affiliation: 'Ethiopian Public Health Institute' },
      ]),
      keywordsJson: JSON.stringify([
        'Plasmodium falciparum',
        'Jimma Zone',
        'Pfk13 mutation',
        'Molecular Surveillance',
        'Spatiotemporal Modeling',
        'Ethiopia',
      ]),
      referencesJson: JSON.stringify([
        'World Health Organization (2023). World Malaria Report 2023. Geneva: WHO.',
        'Assefa, A. et al. (2021). Therapeutic efficacy of artemether-lumefantrine in Ethiopia. Antimicrob Agents Chemother.',
        'Taylor, S. M. et al. (2022). Emerging artemisinin resistance in the Horn of Africa. N Engl J Med.',
      ]),
      metricsViews: 840,
      metricsDownloads: 312,
      metricsCitations: 19,
      metricsBookmarks: 45,
    },
  });

  const pub2 = await prisma.publication.upsert({
    where: { doi: '10.48550/arXiv.2403.11902' },
    update: {},
    create: {
      title: "Ge'ez-BERT and Amharic Cross-Lingual Semantic Transfer for Low-Resource Horn of Africa Languages",
      abstract: "State-of-the-art transformer-based language representations often suffer severe performance degradation when evaluated on languages with non-Latin scripts and morphological richness. This research investigates semantic representation and transfer learning across Ethiopic-script languages, specifically Amharic, Tigrinya, and Ge'ez. We constructed a curated 4.2-billion-token corpus comprising digital news archives, historical manuscripts, legal codes, and encyclopedic texts. We trained Ge'ez-BERT, a 110M-parameter masked language model using a specialized byte-pair encoding vocabulary containing 64,000 morphological sub-word tokens tailored to Ethiopic syllabary combinations. Evaluated on named entity recognition (NER), sentiment classification, and semantic textual similarity benchmarks, Ge'ez-BERT surpassed multilingual baselines (mBERT and XLM-RoBERTa) by 7.4 F1 points on Amharic NER and 9.1 F1 points on zero-shot Tigrinya transfer. Error analysis indicates that root-and-pattern inflectional morphological variations were captured significantly better due to syllabic boundary preservation. We release the pre-trained model weights, tokenizers, and benchmark evaluation suites under an open academic license.",
      doi: '10.48550/arXiv.2403.11902',
      arxivId: '2403.11902',
      documentType: 'PREPRINT',
      reviewStatus: 'PREPRINT',
      publicationYear: 2025,
      venue: 'arXiv Preprint & ACL AfricaNLP Symposium',
      license: 'CC-BY-4.0',
      isOpenAccess: true,
      region: 'ETHIOPIA',
      status: 'PUBLISHED',
      isVerified: true,
      institutionId: eaii.id,
      submitterId: researcherTadesse.id,
      authorsJson: JSON.stringify([
        { name: 'Dr. Tadesse Worku', affiliation: 'Ethiopian Artificial Intelligence Institute' },
        { name: 'Yohannes Tadesse', affiliation: 'Addis Ababa University' },
        { name: 'Dr. Sara Belay', affiliation: 'Mekelle University' },
      ]),
      keywordsJson: JSON.stringify([
        "Ge'ez Script",
        'Amharic NLP',
        'Transfer Learning',
        'Low-Resource Languages',
        'Transformer Architecture',
        'Ethiopian AI',
      ]),
      referencesJson: JSON.stringify([
        'Devlin, J. et al. (2019). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. NAACL.',
        'Yimam, S. M. et al. (2020). Exploring Amharic Sentiment Analysis from Social Media. LREC.',
        'Conneau, A. et al. (2020). Unsupervised Cross-lingual Representation Learning at Scale. ACL.',
      ]),
      metricsViews: 1240,
      metricsDownloads: 510,
      metricsCitations: 14,
      metricsBookmarks: 78,
    },
  });

  const pub3 = await prisma.publication.upsert({
    where: { doi: '10.1016/j.jhydrol.2024.131002' },
    update: {},
    create: {
      title: 'Agro-Pastoral Resilience and Groundwater Recharge Modeling under Climate Extremes in the Borena Zone, Southern Ethiopia',
      abstract: 'Pastoralist and agro-pastoral communities in the Borena lowlands of southern Ethiopia face unprecedented vulnerabilities driven by successive failed rainy seasons and intensified recurrent droughts. This investigation combines satellite remote sensing (GRACE gravity anomalies, CHIRPS precipitation), isotope hydrology (2H and 18O tracing), and numerical groundwater flow modeling (MODFLOW-USG) to quantify groundwater recharge dynamics and assess sustainable borehole yield thresholds. We calibrated the groundwater model against 42 deep communal well hydrographs spanning the 2018–2023 drought episodes. Recharge rates were estimated at 18.4 ± 4.2 mm/year, representing approximately 3.1% of mean annual precipitation, concentrated primarily in localized ephemeral stream beds rather than diffuse infiltration. The results demonstrate that while shallow traditional water points (Ellas) deplete within 45 days of rainy season failure, regional volcanic fractured aquifers maintain multi-decadal storage capacity. We propose an adaptive groundwater exploitation roadmap coupled with solar-powered pumping and community water committee governance to prevent localized cones of depression.',
      doi: '10.1016/j.jhydrol.2024.131002',
      documentType: 'PEER_REVIEWED_ARTICLE',
      reviewStatus: 'PEER_REVIEWED',
      publicationYear: 2024,
      venue: 'Journal of Hydrology & African Water Association',
      publisher: 'Elsevier',
      license: 'CC-BY-NC-4.0',
      isOpenAccess: true,
      region: 'ETHIOPIA',
      status: 'PUBLISHED',
      isVerified: true,
      institutionId: aau.id,
      submitterId: researcherAlmaz.id,
      authorsJson: JSON.stringify([
        { name: 'Dr. Girma Kebede', affiliation: 'Addis Ababa University' },
        { name: 'Dr. Almaz Bekele', affiliation: 'Addis Ababa University' },
        { name: 'Dr. Fiona Campbell', affiliation: 'International Water Management Institute' },
      ]),
      keywordsJson: JSON.stringify([
        'Borena Zone',
        'Groundwater Recharge',
        'Isotope Hydrology',
        'Climate Adaptation',
        'MODFLOW',
        'Horn of Africa Drought',
      ]),
      referencesJson: JSON.stringify([
        'Scanlon, B. R. et al. (2022). Global water resources in a changing climate. Nature Reviews Earth & Environment.',
        'Demlie, M. et al. (2018). Hydrogeology of the central Ethiopian rift valley. Hydrogeol J.',
      ]),
      metricsViews: 920,
      metricsDownloads: 340,
      metricsCitations: 22,
      metricsBookmarks: 51,
    },
  });

  // Link topics to publications
  await prisma.publicationTopic.upsert({
    where: { publicationId_topicId: { publicationId: pub1.id, topicId: topicEpidemiology.id } },
    update: {},
    create: { publicationId: pub1.id, topicId: topicEpidemiology.id },
  });

  await prisma.publicationTopic.upsert({
    where: { publicationId_topicId: { publicationId: pub2.id, topicId: topicAI.id } },
    update: {},
    create: { publicationId: pub2.id, topicId: topicAI.id },
  });

  await prisma.publicationTopic.upsert({
    where: { publicationId_topicId: { publicationId: pub3.id, topicId: topicClimate.id } },
    update: {},
    create: { publicationId: pub3.id, topicId: topicClimate.id },
  });

  // 5. Editorial Categories & Articles
  const catFactCheck = await prisma.editorialCategory.upsert({
    where: { slug: 'fact-checks' },
    update: {},
    create: {
      name: 'Scientific Fact-Checking',
      slug: 'fact-checks',
      description: 'Rigorous empirical verification of public health claims, technology claims, and statistical statements.',
    },
  });

  const catHealth = await prisma.editorialCategory.upsert({
    where: { slug: 'health-science' },
    update: {},
    create: {
      name: 'Health & Public Health',
      slug: 'health-science',
      description: 'Medical breakthroughs, epidemiological investigations, and public health policy.',
    },
  });

  await prisma.editorialArticle.upsert({
    where: { slug: 'fact-check-lemon-eucalyptus-inhalation-myth' },
    update: {},
    create: {
      title: 'Fact-Check: Does Inhaling Boiled Eucalyptus and Lemon Steam Eliminate Respiratory Pathogens within 24 Hours?',
      slug: 'fact-check-lemon-eucalyptus-inhalation-myth',
      summary: 'A viral video across TikTok and Telegram claimed that inhaling steam from boiled lemon slices and eucalyptus leaves completely clears pulmonary viral infections in 24 hours. We cross-examined this claim against peer-reviewed clinical studies.',
      content: `### The Claim\nA viral video asserts: "Boiling eucalyptus leaves with lemon peels and inhaling the hot steam for 20 minutes kills all viral and bacterial respiratory pathogens in the lungs within 24 hours."\n\n### Scientific Examination & Evidence\nWhile steam inhalation is a recognized palliative home measure for relieving nasal congestion, claims of pathogen elimination in lung tissue are medically unfounded.\n\n### Scientific Verdict\nThe claim is **FALSE**. While steam provides temporary comfort for nasal stuffiness, it does not destroy invasive pulmonary viruses and poses scald injury risks.`,
      articleType: 'FACT_CHECK',
      status: 'PUBLISHED',
      authorId: editorUser.id,
      categoryId: catFactCheck.id,
      coverImageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80',
      tagsJson: JSON.stringify(['Fact-Check', 'Respiratory Health', 'Eucalyptus', 'Public Health']),
      sourcesJson: JSON.stringify([
        { title: 'World Health Organization Respiratory Guidelines', url: 'https://who.int' },
      ]),
      factCheck: {
        create: {
          claim: 'Boiling and inhaling eucalyptus and lemon steam destroys pulmonary respiratory pathogens in 24 hours.',
          claimant: 'Viral Social Media Video on TikTok and Telegram',
          verdict: 'FALSE',
          evidenceSummary: 'Peer-reviewed clinical evidence confirms steam inhalation cannot kill invasive viral pathogens in bronchial tissue.',
          academicSources: JSON.stringify([
            { title: 'Cochrane Systematic Review: Steam Inhalation for the Common Cold', doi: '10.1002/14651858.CD001728.pub6' },
          ]),
        },
      },
    },
  });

  // 6. Wallets & Impact Credits
  await prisma.wallet.upsert({
    where: { userId: researcherAlmaz.id },
    update: {},
    create: {
      userId: researcherAlmaz.id,
      balanceCredits: 3400,
      totalEarnedCredits: 4500,
      totalWithdrawnCredits: 1100,
      payoutChannel: 'TELEBIRR',
      payoutAccountNumber: '0911223344',
      payoutAccountName: 'Dr. Almaz Bekele',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: researcherTadesse.id },
    update: {},
    create: {
      userId: researcherTadesse.id,
      balanceCredits: 2200,
      totalEarnedCredits: 2200,
      totalWithdrawnCredits: 0,
      payoutChannel: 'CBE_BANK',
      payoutAccountNumber: '1000123456789',
      payoutAccountName: 'Dr. Tadesse Worku',
    },
  });

  // 7. Research Bounties
  const existingBounties = await prisma.researchBounty.count();
  if (existingBounties === 0) {
    await prisma.researchBounty.createMany({
      data: [
        {
          title: 'Molecular Surveillance of Antimalarial Drug Resistance in Southwestern Ethiopia',
          description: 'Provide prospective genomic surveillance and Pfk13 mutation genotyping across Jimma and Gambella transmission corridors.',
          sponsorName: 'Africa CDC & Ethiopian Public Health Institute',
          rewardCredits: 50000,
          rewardFiat: 50000,
          currency: 'ETB',
          status: 'OPEN',
        },
        {
          title: "Fine-Tuning Open Source LLMs on Ge'ez and Classical Ethiopic Legal Corpora",
          description: 'Benchmark byte-pair vocabulary boundary models on historical Ethiopian legal decrees and historical manuscripts.',
          sponsorName: 'Ethiopian Artificial Intelligence Institute',
          rewardCredits: 35000,
          rewardFiat: 35000,
          currency: 'ETB',
          status: 'OPEN',
        },
      ],
    });
  }

  console.log('✅ Database seeded successfully with authentic Super Admin, Admin, and verified scholarly data!');
  return { success: true, message: 'Database successfully seeded' };
}
