"""
Deterministic ATS keyword extractor.

Problem it solves:
  The LLM-only `matched_keywords` / `missing_keywords` lists in
  `AIService.analyze_ats` / `tailor_resume` are generative: the model invents
  a short subset (10-20 terms) of what it *thinks* matters. Any real JD term
  it doesn't emit appears NEITHER as matched NOR missing, so the
  "ATS Optimization" tab looks incomplete and the JD highlight view leaves
  large parts of the ad unmarked.

Fix strategy (hybrid, deterministic ground truth + LLM supplement):
  1. Exhaustively scan the RAW job-description text with a curated taxonomy
     (curated taxonomy + ingested 954-skill marketplace list).
  2. Deterministically check each found JD term against the CV text
     (normalized + synonym-aware: React <-> React.js, AWS <-> Amazon Web
     Services, Postgres <-> PostgreSQL, ...).
  3. Union the deterministic set with whatever the LLM returned, de-duplicate
     case-insensitively, and re-validate every term against the CV so a term
     can never be in both lists and nothing found in the JD is dropped.

Only stdlib is used so no new dependencies are required.
"""

import json
import re

# ---------------------------------------------------------------------------
# Taxonomy: canonical name -> (category, aliases including canonical)
# category must be one of: hard_skills | tools | soft_skills
# ---------------------------------------------------------------------------
# NOTE: keep aliases lowercase; matching is case-insensitive.

_TAXONOMY_RAW = [
    # ---- programming languages ----
    ("Python", "hard_skills", ["python"]),
    ("JavaScript", "hard_skills", ["javascript", "js", "ecmascript"]),
    ("TypeScript", "hard_skills", ["typescript", "ts"]),
    ("Java", "hard_skills", ["java"]),
    ("C++", "hard_skills", ["c++"]),
    ("C#", "hard_skills", ["c#", "c sharp", "csharp"]),
    ("Go", "hard_skills", ["golang", "go"]),
    ("Rust", "hard_skills", ["rust"]),
    ("PHP", "hard_skills", ["php"]),
    ("Ruby", "hard_skills", ["ruby"]),
    ("Kotlin", "hard_skills", ["kotlin"]),
    ("Swift", "hard_skills", ["swift"]),
    ("Scala", "hard_skills", ["scala"]),
    ("R", "hard_skills", ["r programming"]),
    ("Dart", "hard_skills", ["dart"]),
    ("Elixir", "hard_skills", ["elixir"]),
    ("Haskell", "hard_skills", ["haskell"]),
    ("Clojure", "hard_skills", ["clojure"]),
    ("Perl", "hard_skills", ["perl"]),
    ("Lua", "hard_skills", ["lua"]),
    ("MATLAB", "hard_skills", ["matlab"]),
    ("VBA", "hard_skills", ["vba"]),
    ("Solidity", "hard_skills", ["solidity"]),
    ("Bash", "hard_skills", ["bash", "shell scripting", "shell script"]),
    ("PowerShell", "hard_skills", ["powershell"]),
    ("SQL", "hard_skills", ["sql"]),
    ("HTML", "hard_skills", ["html", "html5"]),
    ("CSS", "hard_skills", ["css", "css3"]),
    ("Sass", "hard_skills", ["sass", "scss"]),
    ("Less", "hard_skills", ["less css"]),

    # ---- frontend ----
    ("React", "hard_skills", ["react", "react.js", "reactjs"]),
    ("Angular", "hard_skills", ["angular", "angularjs"]),
    ("Vue", "hard_skills", ["vue", "vue.js", "vuejs"]),
    ("Nuxt", "hard_skills", ["nuxt", "nuxt.js", "nuxtjs"]),
    ("Next.js", "hard_skills", ["next.js", "nextjs", "next js"]),
    ("Svelte", "hard_skills", ["svelte", "sveltekit"]),
    ("Redux", "hard_skills", ["redux", "redux toolkit", "rtk"]),
    ("Zustand", "hard_skills", ["zustand"]),
    ("Tailwind CSS", "hard_skills", ["tailwind", "tailwindcss", "tailwind css"]),
    ("Bootstrap", "hard_skills", ["bootstrap"]),
    ("Material UI", "hard_skills", ["material ui", "material-ui", "mui"]),
    ("jQuery", "hard_skills", ["jquery"]),
    ("Webpack", "tools", ["webpack"]),
    ("Vite", "tools", ["vite"]),
    ("Babel", "tools", ["babel"]),
    ("ESLint", "tools", ["eslint"]),
    ("Prettier", "tools", ["prettier"]),
    ("Responsive Design", "hard_skills", ["responsive design", "responsive web design"]),
    ("Accessibility", "hard_skills", ["accessibility", "a11y", "wcag"]),

    # ---- backend / frameworks ----
    ("Node.js", "hard_skills", ["node.js", "nodejs", "node js", "node"]),
    ("Express", "hard_skills", ["express", "express.js", "expressjs"]),
    ("NestJS", "hard_skills", ["nestjs", "nest.js", "nest js"]),
    ("Django", "hard_skills", ["django", "django rest", "django-rest", "drf", "django rest framework"]),
    ("Flask", "hard_skills", ["flask"]),
    ("FastAPI", "hard_skills", ["fastapi", "fast api"]),
    ("Spring", "hard_skills", ["spring", "spring boot", "springboot"]),
    (".NET", "hard_skills", [".net", "dotnet", "asp.net", "aspnet", "c#.net"]),
    ("Laravel", "hard_skills", ["laravel"]),
    ("Ruby on Rails", "hard_skills", ["rails", "ruby on rails", "ror"]),
    ("Symfony", "hard_skills", ["symfony"]),
    ("GraphQL", "hard_skills", ["graphql"]),
    ("REST API", "hard_skills", ["rest", "rest api", "restful", "restful api"]),
    ("gRPC", "hard_skills", ["grpc"]),
    ("WebSockets", "hard_skills", ["websocket", "websockets", "web sockets"]),
    ("Microservices", "hard_skills", ["microservices", "microservice", "micro-service"]),
    ("Serverless", "hard_skills", ["serverless", "lambda", "aws lambda"]),
    ("OAuth", "hard_skills", ["oauth", "oauth2", "openid", "jwt", "json web token"]),
    ("Celery", "hard_skills", ["celery"]),
    ("Redis", "hard_skills", ["redis"]),

    # ---- databases ----
    ("PostgreSQL", "hard_skills", ["postgresql", "postgres", "psql"]),
    ("MySQL", "hard_skills", ["mysql"]),
    ("MongoDB", "hard_skills", ["mongodb", "mongo"]),
    ("SQLite", "hard_skills", ["sqlite"]),
    ("Oracle DB", "hard_skills", ["oracle", "oracle db", "oracle database", "pl/sql", "plsql"]),
    ("SQL Server", "hard_skills", ["sql server", "mssql", "t-sql", "tsql"]),
    ("Elasticsearch", "hard_skills", ["elasticsearch", "elastic search", "elk", "opensearch"]),
    ("Cassandra", "hard_skills", ["cassandra"]),
    ("DynamoDB", "hard_skills", ["dynamodb", "dynamo db"]),
    ("Firestore", "hard_skills", ["firestore"]),
    ("BigQuery", "hard_skills", ["bigquery", "big query"]),
    ("Snowflake", "hard_skills", ["snowflake"]),
    ("Kafka", "hard_skills", ["kafka", "apache kafka"]),
    ("RabbitMQ", "hard_skills", ["rabbitmq", "rabbit mq"]),
    ("Database Design", "hard_skills", ["database design", "data modeling", "data modelling", "schema design"]),
    ("ORM", "hard_skills", ["orm", "sqlalchemy", "hibernate", "prisma", "typeorm", "sequelize"]),

    # ---- cloud / devops ----
    ("AWS", "tools", ["aws", "amazon web services"]),
    ("Azure", "tools", ["azure", "microsoft azure"]),
    ("GCP", "tools", ["gcp", "google cloud", "google cloud platform"]),
    ("Docker", "tools", ["docker", "dockerfile", "docker compose", "docker-compose"]),
    ("Kubernetes", "tools", ["kubernetes", "k8s", "helm"]),
    ("Terraform", "tools", ["terraform", "terragrunt"]),
    ("Ansible", "tools", ["ansible"]),
    ("Jenkins", "tools", ["jenkins"]),
    ("GitLab CI", "tools", ["gitlab ci", "gitlab"]),
    ("GitHub Actions", "tools", ["github actions", "gh actions"]),
    ("CI/CD", "tools", ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment", "ci", "cd"]),
    ("Nginx", "tools", ["nginx"]),
    ("Apache", "tools", ["apache"]),
    ("Linux", "tools", ["linux", "unix"]),
    ("Bash/Shell", "tools", ["bash", "shell", "command line", "cli"]),
    ("Monitoring", "tools", ["prometheus", "grafana", "datadog", "new relic", "sentry", "monitoring", "observability", "logging"]),
    ("CloudFormation", "tools", ["cloudformation", "cloud formation"]),
    ("Pulumi", "tools", ["pulumi"]),
    ("ArgoCD", "tools", ["argocd", "argo cd"]),
    ("Istio", "tools", ["istio", "service mesh"]),

    # ---- version control / project tools ----
    ("Git", "tools", ["git", "github", "bitbucket"]),
    ("Jira", "tools", ["jira"]),
    ("Confluence", "tools", ["confluence"]),
    ("Notion", "tools", ["notion"]),
    ("Figma", "tools", ["figma"]),
    ("Slack", "tools", ["slack"]),
    ("Trello", "tools", ["trello"]),
    ("Asana", "tools", ["asana"]),
    ("Miro", "tools", ["miro"]),

    # ---- testing / quality ----
    ("Unit Testing", "hard_skills", ["unit testing", "unit tests", "pytest", "junit", "jest", "vitest", "mocha", "cypress", "playwright", "selenium", "testing library", "react testing library"]),
    ("Integration Testing", "hard_skills", ["integration testing", "integration tests", "e2e", "end-to-end testing", "end to end testing"]),
    ("Test-Driven Development", "hard_skills", ["tdd", "test-driven development", "test driven development"]),
    ("Code Review", "hard_skills", ["code review", "code reviews", "peer review"]),
    ("Debugging", "hard_skills", ["debugging", "troubleshooting"]),

    # ---- data / AI ----
    ("Machine Learning", "hard_skills", ["machine learning", "ml", "deep learning", "neural network", "neural networks"]),
    ("TensorFlow", "hard_skills", ["tensorflow", "tf"]),
    ("PyTorch", "hard_skills", ["pytorch", "torch"]),
    ("scikit-learn", "hard_skills", ["scikit-learn", "scikit learn", "sklearn"]),
    ("Pandas", "hard_skills", ["pandas"]),
    ("NumPy", "hard_skills", ["numpy"]),
    ("Data Analysis", "hard_skills", ["data analysis", "data analytics", "data visualization", "data visualisation", "tableau", "power bi", "powerbi", "matplotlib", "plotly"]),
    ("NLP", "hard_skills", ["nlp", "natural language processing", "llm", "large language models", "transformers", "hugging face", "rag", "prompt engineering"]),
    ("Computer Vision", "hard_skills", ["computer vision", "opencv", "image processing"]),
    ("MLOps", "hard_skills", ["mlops", "ml ops", "model deployment", "kubeflow", "mlflow"]),
    ("Hadoop", "hard_skills", ["hadoop"]),
    ("Spark", "hard_skills", ["spark", "apache spark", "pyspark", "databricks"]),
    ("Airflow", "hard_skills", ["airflow", "apache airflow"]),
    ("ETL", "hard_skills", ["etl", "data pipeline", "data pipelines", "data engineering"]),

    # ---- mobile ----
    ("Flutter", "hard_skills", ["flutter"]),
    ("React Native", "hard_skills", ["react native", "react-native"]),
    ("iOS", "hard_skills", ["ios", "swift", "swiftui", "xcode"]),
    ("Android", "hard_skills", ["android", "android sdk"]),
    ("Xamarin", "hard_skills", ["xamarin"]),
    ("Ionic", "hard_skills", ["ionic"]),

    # ---- methodologies / practices ----
    ("Agile", "soft_skills", ["agile", "agile methodology", "agile development"]),
    ("Scrum", "soft_skills", ["scrum", "scrum master"]),
    ("Kanban", "soft_skills", ["kanban"]),
    ("DevOps", "hard_skills", ["devops", "devsecops", "sre", "site reliability"]),
    ("Code Quality", "hard_skills", ["clean code", "code quality", "solid", "design patterns", "refactoring", "code architecture"]),
    ("API Design", "hard_skills", ["api design", "api development", "openapi", "swagger"]),
    ("System Design", "hard_skills", ["system design", "software architecture", "solution architecture", "distributed systems", "scalability", "high availability", "load balancing"]),
    ("Performance Optimization", "hard_skills", ["performance optimization", "performance tuning", "optimization", "caching", "query optimization"]),
    ("Security", "hard_skills", ["security", "cybersecurity", "owasp", "penetration testing", "vulnerability", "encryption", "authentication", "authorization"]),
    ("Documentation", "soft_skills", ["documentation", "technical documentation", "technical writing"]),

    # ---- soft skills (kept deliberately small: only match when literally present) ----
    ("Communication", "soft_skills", ["communication", "communicative", "kommunikation", "kommunikativ"]),
    ("Teamwork", "soft_skills", ["teamwork", "team player", "teamarbeit", "teamfähig", "team oriented"]),
    ("Leadership", "soft_skills", ["leadership", "team lead", "führung", "führungserfahrung", "mentoring", "mentorship"]),
    ("Problem Solving", "soft_skills", ["problem solving", "problem-solving", "analytical thinking", "analytical skills", "problemlösung"]),
    ("Time Management", "soft_skills", ["time management", "self-organized", "self organised", "selbstständig", "eigenverantwortlich", "prioritization"]),
    ("Adaptability", "soft_skills", ["adaptability", "flexibility", "flexibilität", "adaptable"]),
    ("Attention to Detail", "soft_skills", ["attention to detail", "detail-oriented", "detail orientated", "sorgfalt", "sorgfältig"]),
    ("Collaboration", "soft_skills", ["collaboration", "collaborative", "cross-functional", "zusammenarbeit"]),
    ("Customer Focus", "soft_skills", ["customer focus", "customer-oriented", "kundenorientiert", "client focus"]),
    ("Ownership", "soft_skills", ["ownership", "accountability", "eigeninitiative", "proactive", "proaktiv"]),
    ("Stakeholder Management", "soft_skills", ["stakeholder management", "stakeholder"]),
    ("Presentation Skills", "soft_skills", ["presentation", "presentations", "präsentation"]),

    # ---- education / experience markers often used as ATS filters ----
    ("Bachelor's Degree", "hard_skills", ["bachelor", "b.sc", "bsc", "bachelor's degree", "bachelor degree", "undergraduate degree"]),
    ("Master's Degree", "hard_skills", ["master", "m.sc", "msc", "master's degree", "master degree", "graduate degree"]),
    ("PhD", "hard_skills", ["phd", "ph.d", "doctorate", "doctoral"]),
    ("Certification", "hard_skills", ["certification", "certified", "zertifizierung", "zertifikat"]),
    ("English", "soft_skills", ["english", "englisch"]),
    # ("German", "soft_skills", ["german", "deutsch"]),
    # ---- ingested freelance-marketplace list (954 skills gist) ----
    ("360-degree video", "tools", ["360-degree video"]),
    ("3D Animation", "hard_skills", ["3d animation"]),
    ("3D Design", "hard_skills", ["3d design"]),
    ("3D Model Maker", "hard_skills", ["3d model maker"]),
    ("3D Modelling", "hard_skills", ["3d modelling"]),
    ("3D Printing", "hard_skills", ["3d printing"]),
    ("3D Rendering", "hard_skills", ["3d rendering"]),
    ("3ds Max", "hard_skills", ["3ds max"]),
    ("4D", "hard_skills", ["4d"]),
    ("Academic Writing", "soft_skills", ["academic writing"]),
    ("Accounting", "soft_skills", ["accounting"]),
    ("ActionScript", "hard_skills", ["actionscript"]),
    ("Active Directory", "hard_skills", ["active directory"]),
    ("Ad Planning / Buying", "hard_skills", ["ad planning / buying", "ad planning", "buying"]),
    ("Adobe Air", "hard_skills", ["adobe air"]),
    ("Adobe Captivate", "hard_skills", ["adobe captivate"]),
    ("Adobe Dreamweaver", "hard_skills", ["adobe dreamweaver"]),
    ("Adobe Fireworks", "hard_skills", ["adobe fireworks"]),
    ("Adobe Flash", "hard_skills", ["adobe flash"]),
    ("Adobe InDesign", "hard_skills", ["adobe indesign"]),
    ("Adobe Lightroom", "hard_skills", ["adobe lightroom"]),
    ("Adobe LiveCycle Designer", "hard_skills", ["adobe livecycle designer"]),
    ("Adobe Premiere Pro", "hard_skills", ["adobe premiere pro"]),
    ("Advertisement Design", "hard_skills", ["advertisement design"]),
    ("Advertising", "hard_skills", ["advertising"]),
    ("Aeronautical Engineering", "hard_skills", ["aeronautical engineering"]),
    ("Aerospace Engineering", "hard_skills", ["aerospace engineering"]),
    ("Affiliate Marketing", "soft_skills", ["affiliate marketing"]),
    ("Afrikaans", "hard_skills", ["afrikaans"]),
    ("After Effects", "hard_skills", ["after effects"]),
    ("Agile Development", "soft_skills", ["agile development"]),
    ("Agronomy", "hard_skills", ["agronomy"]),
    ("Air Conditioning", "hard_skills", ["air conditioning"]),
    ("Airbnb", "hard_skills", ["airbnb"]),
    ("AJAX", "hard_skills", ["ajax"]),
    ("Albanian", "hard_skills", ["albanian"]),
    ("Algorithm", "hard_skills", ["algorithm"]),
    ("Alibaba", "hard_skills", ["alibaba"]),
    ("Amazon Fire", "hard_skills", ["amazon fire"]),
    ("Amazon Kindle", "hard_skills", ["amazon kindle"]),
    ("Amazon Web Services", "soft_skills", ["amazon web services"]),
    ("AMQP", "hard_skills", ["amqp"]),
    ("Analytics", "hard_skills", ["analytics"]),
    ("Android Honeycomb", "hard_skills", ["android honeycomb"]),
    ("Android Wear SDK", "tools", ["android wear sdk"]),
    ("Angular.js", "hard_skills", ["angular.js"]),
    ("Animation", "hard_skills", ["animation"]),
    ("Antenna Services", "soft_skills", ["antenna services"]),
    ("Anything Goes", "hard_skills", ["anything goes"]),
    ("Apache Ant", "hard_skills", ["apache ant"]),
    ("Apache Solr", "hard_skills", ["apache solr"]),
    ("App Designer", "hard_skills", ["app designer"]),
    ("App Developer", "hard_skills", ["app developer"]),
    ("Appcelerator Titanium", "hard_skills", ["appcelerator titanium"]),
    ("Apple Compressor", "hard_skills", ["apple compressor"]),
    ("Apple iBooks Author", "hard_skills", ["apple ibooks author"]),
    ("Apple Logic Pro", "hard_skills", ["apple logic pro"]),
    ("Apple Motion", "hard_skills", ["apple motion"]),
    ("Apple Safari", "hard_skills", ["apple safari"]),
    ("Apple Watch", "hard_skills", ["apple watch"]),
    ("Applescript", "hard_skills", ["applescript"]),
    ("Appliance Installation", "hard_skills", ["appliance installation"]),
    ("Appliance Repair", "hard_skills", ["appliance repair"]),
    ("Arabic", "hard_skills", ["arabic"]),
    ("Arduino", "hard_skills", ["arduino"]),
    ("Argus Monitoring Software", "hard_skills", ["argus monitoring software"]),
    ("Article Rewriting", "soft_skills", ["article rewriting"]),
    ("Article Submission", "hard_skills", ["article submission"]),
    ("Articles", "hard_skills", ["articles"]),
    ("Artificial Intelligence", "hard_skills", ["artificial intelligence", "ai"]),
    ("Arts / Crafts", "hard_skills", ["arts / crafts", "arts", "crafts"]),
    ("AS400 / iSeries", "hard_skills", ["as400 / iseries", "as400", "iseries"]),
    ("Asbestos Removal", "hard_skills", ["asbestos removal"]),
    ("ASP", "hard_skills", ["asp"]),
    ("ASP.NET", "hard_skills", ["asp.net"]),
    ("Asphalt", "hard_skills", ["asphalt"]),
    ("Assembly", "hard_skills", ["assembly"]),
    ("Asterisk PBX", "hard_skills", ["asterisk pbx"]),
    ("Astrophysics", "hard_skills", ["astrophysics"]),
    ("Attic Access Ladders", "hard_skills", ["attic access ladders"]),
    ("Attorney", "hard_skills", ["attorney"]),
    ("Audio Production", "hard_skills", ["audio production"]),
    ("Audio Services", "soft_skills", ["audio services"]),
    ("Audit", "hard_skills", ["audit"]),
    ("Augmented Reality", "hard_skills", ["augmented reality", "ar"]),
    ("AutoCAD", "tools", ["autocad"]),
    ("Autodesk Inventor", "hard_skills", ["autodesk inventor"]),
    ("Autodesk Revit", "hard_skills", ["autodesk revit"]),
    ("AutoHotkey", "hard_skills", ["autohotkey"]),
    ("Automotive", "hard_skills", ["automotive"]),
    ("Autotask", "hard_skills", ["autotask"]),
    ("Awnings", "hard_skills", ["awnings"]),
    ("Axure", "hard_skills", ["axure"]),
    ("backbone.js", "hard_skills", ["backbone.js"]),
    ("Balsamiq", "hard_skills", ["balsamiq"]),
    ("Balustrading", "hard_skills", ["balustrading"]),
    ("Bamboo Flooring", "hard_skills", ["bamboo flooring"]),
    ("Banner Design", "hard_skills", ["banner design"]),
    ("Basque", "hard_skills", ["basque"]),
    ("Bathroom", "hard_skills", ["bathroom"]),
    ("Bengali", "hard_skills", ["bengali"]),
    ("Big Data", "hard_skills", ["big data"]),
    ("BigCommerce", "hard_skills", ["bigcommerce"]),
    ("Binary Analysis", "hard_skills", ["binary analysis"]),
    ("Biology", "hard_skills", ["biology"]),
    ("Biotechnology", "hard_skills", ["biotechnology"]),
    ("Bitcoin", "hard_skills", ["bitcoin"]),
    ("Biztalk", "hard_skills", ["biztalk"]),
    ("Blackberry", "hard_skills", ["blackberry"]),
    ("Blog", "hard_skills", ["blog"]),
    ("Blog Design", "hard_skills", ["blog design"]),
    ("Blog Install", "hard_skills", ["blog install"]),
    ("Bluetooth Low Energy (BLE)", "hard_skills", ["bluetooth low energy (ble)", "bluetooth low energy", "ble"]),
    ("BMC Remedy", "hard_skills", ["bmc remedy"]),
    ("Book Artist", "hard_skills", ["book artist"]),
    ("Book Writing", "soft_skills", ["book writing"]),
    ("Bookkeeping", "hard_skills", ["bookkeeping"]),
    ("Boonex Dolphin", "hard_skills", ["boonex dolphin"]),
    ("Bosnian", "hard_skills", ["bosnian"]),
    ("Bower", "hard_skills", ["bower"]),
    ("BPO", "hard_skills", ["bpo"]),
    ("Brackets", "hard_skills", ["brackets"]),
    ("Brain Storming", "hard_skills", ["brain storming"]),
    ("Branding", "hard_skills", ["branding"]),
    ("Bricklaying", "hard_skills", ["bricklaying"]),
    ("Broadcast Engineering", "hard_skills", ["broadcast engineering"]),
    ("Brochure Design", "hard_skills", ["brochure design"]),
    ("BSD", "hard_skills", ["bsd"]),
    ("Building", "hard_skills", ["building"]),
    ("Building Architecture", "hard_skills", ["building architecture"]),
    ("Building Certifiers", "hard_skills", ["building certifiers"]),
    ("Building Consultants", "hard_skills", ["building consultants"]),
    ("Building Designer", "hard_skills", ["building designer"]),
    ("Building Surveyors", "hard_skills", ["building surveyors"]),
    ("Bulgarian", "hard_skills", ["bulgarian"]),
    ("Bulk Marketing", "soft_skills", ["bulk marketing"]),
    ("Business Analysis", "hard_skills", ["business analysis"]),
    ("Business Cards", "hard_skills", ["business cards"]),
    ("Business Catalyst", "hard_skills", ["business catalyst"]),
    ("Business Coaching", "soft_skills", ["business coaching"]),
    ("Business Intelligence", "hard_skills", ["business intelligence", "bi"]),
    ("Business Plans", "hard_skills", ["business plans"]),
    ("Business Writing", "soft_skills", ["business writing"]),
    ("Buyer Sourcing", "hard_skills", ["buyer sourcing"]),
    ("C Programming", "hard_skills", ["c programming"]),
    ("C# Programming", "hard_skills", ["c# programming", "c#"]),
    ("C++ Programming", "hard_skills", ["c++ programming", "c++"]),
    ("CAD/CAM", "hard_skills", ["cad/cam", "cad", "cam"]),
    ("CakePHP", "hard_skills", ["cakephp"]),
    ("Call Center", "hard_skills", ["call center"]),
    ("Call Control XML", "hard_skills", ["call control xml"]),
    ("Capture NX2", "hard_skills", ["capture nx2"]),
    ("Caricature / Cartoons", "hard_skills", ["caricature / cartoons", "caricature", "cartoons"]),
    ("Carpentry", "hard_skills", ["carpentry"]),
    ("Carpet Repair / Laying", "hard_skills", ["carpet repair / laying", "carpet repair", "laying"]),
    ("Carports", "hard_skills", ["carports"]),
    ("Cartography / Maps", "hard_skills", ["cartography / maps", "cartography", "maps"]),
    ("Carwashing", "hard_skills", ["carwashing"]),
    ("CasperJS", "hard_skills", ["casperjs"]),
    ("Catalan", "hard_skills", ["catalan"]),
    ("Catch Phrases", "hard_skills", ["catch phrases"]),
    ("CATIA", "hard_skills", ["catia"]),
    ("Ceilings", "hard_skills", ["ceilings"]),
    ("Cement Bonding Agents", "hard_skills", ["cement bonding agents"]),
    ("CGI", "hard_skills", ["cgi"]),
    ("Chef Configuration Management", "soft_skills", ["chef configuration management"]),
    ("Chemical Engineering", "hard_skills", ["chemical engineering"]),
    ("Chordiant", "hard_skills", ["chordiant"]),
    ("Christmas", "hard_skills", ["christmas"]),
    ("Chrome OS", "hard_skills", ["chrome os"]),
    ("Cinema 4D", "hard_skills", ["cinema 4d"]),
    ("Circuit Design", "hard_skills", ["circuit design"]),
    ("Cisco", "hard_skills", ["cisco"]),
    ("Civil Engineering", "hard_skills", ["civil engineering"]),
    ("Classifieds Posting", "hard_skills", ["classifieds posting"]),
    ("Clean Technology", "hard_skills", ["clean technology"]),
    ("Cleaning Carpet", "hard_skills", ["cleaning carpet"]),
    ("Cleaning Domestic", "hard_skills", ["cleaning domestic"]),
    ("Cleaning Upholstery", "hard_skills", ["cleaning upholstery"]),
    ("Climate Sciences", "hard_skills", ["climate sciences"]),
    ("CLIPS", "hard_skills", ["clips"]),
    ("Clothesline", "hard_skills", ["clothesline"]),
    ("Cloud Computing", "tools", ["cloud computing"]),
    ("CMS", "tools", ["cms"]),
    ("Coating Materials", "hard_skills", ["coating materials"]),
    ("COBOL", "hard_skills", ["cobol"]),
    ("Cocoa", "hard_skills", ["cocoa"]),
    ("Codeigniter", "hard_skills", ["codeigniter"]),
    # ("Coding", "hard_skills", ["coding"]),
    ("Cold Fusion", "hard_skills", ["cold fusion"]),
    ("Columns", "hard_skills", ["columns"]),
    ("Commercial Cleaning", "hard_skills", ["commercial cleaning"]),
    ("Commercials", "hard_skills", ["commercials"]),
    ("Communications", "soft_skills", ["communications"]),
    ("Compliance", "hard_skills", ["compliance"]),
    ("Computer Graphics", "hard_skills", ["computer graphics"]),
    ("Computer Help", "hard_skills", ["computer help"]),
    ("Computer Security", "hard_skills", ["computer security"]),
    ("Concept Art", "hard_skills", ["concept art"]),
    ("Concept Design", "hard_skills", ["concept design"]),
    ("Concreting", "hard_skills", ["concreting"]),
    ("Construction Monitoring", "hard_skills", ["construction monitoring"]),
    ("Content Writing", "soft_skills", ["content writing"]),
    ("Contracts", "hard_skills", ["contracts"]),
    ("Conversion Rate Optimisation", "hard_skills", ["conversion rate optimisation"]),
    ("Cooking / Recipes", "hard_skills", ["cooking / recipes", "cooking", "recipes"]),
    ("Cooking / Baking", "hard_skills", ["cooking / baking", "baking"]),
    ("Copy Typing", "hard_skills", ["copy typing"]),
    ("Copywriting", "soft_skills", ["copywriting"]),
    ("Corporate Identity", "tools", ["corporate identity"]),
    ("Courses", "hard_skills", ["courses"]),
    ("Covers / Packaging", "hard_skills", ["covers / packaging", "covers", "packaging"]),
    ("CRE Loaded", "hard_skills", ["cre loaded"]),
    ("Creative Design", "hard_skills", ["creative design"]),
    ("Creative Writing", "soft_skills", ["creative writing"]),
    ("CRM", "hard_skills", ["crm"]),
    ("Croatian", "hard_skills", ["croatian"]),
    ("Cryptography", "hard_skills", ["cryptography"]),
    ("Crystal Reports", "hard_skills", ["crystal reports"]),
    ("CS-Cart", "hard_skills", ["cs-cart"]),
    ("CubeCart", "hard_skills", ["cubecart"]),
    ("CUDA", "hard_skills", ["cuda"]),
    ("Customer Service", "soft_skills", ["customer service"]),
    ("Customer Support", "soft_skills", ["customer support"]),
    ("Czech", "hard_skills", ["czech"]),
    ("Damp Proofing", "hard_skills", ["damp proofing"]),
    ("Danish", "hard_skills", ["danish"]),
    ("Dari", "hard_skills", ["dari"]),
    ("Data Entry", "hard_skills", ["data entry"]),
    ("Data Mining", "hard_skills", ["data mining"]),
    ("Data Processing", "hard_skills", ["data processing"]),
    ("Data Science", "hard_skills", ["data science"]),
    ("Data Warehousing", "hard_skills", ["data warehousing"]),
    ("Database Administration", "hard_skills", ["database administration"]),
    ("Database Development", "hard_skills", ["database development"]),
    ("Database Programming", "hard_skills", ["database programming", "database"]),
    ("DataLife Engine", "hard_skills", ["datalife engine"]),
    ("Dating", "hard_skills", ["dating"]),
    ("DDS", "hard_skills", ["dds"]),
    ("Debian", "hard_skills", ["debian"]),
    ("Decking", "hard_skills", ["decking"]),
    ("Decoration", "hard_skills", ["decoration"]),
    ("Delivery", "hard_skills", ["delivery"]),
    ("Delphi", "hard_skills", ["delphi"]),
    ("Demolition", "hard_skills", ["demolition"]),
    ("Design", "hard_skills", ["design"]),
    ("Desktop Support", "soft_skills", ["desktop support"]),
    ("Digital Design", "tools", ["digital design"]),
    ("Disposals", "hard_skills", ["disposals"]),
    ("DNS", "hard_skills", ["dns"]),
    ("DOS", "hard_skills", ["dos"]),
    ("DotNetNuke", "hard_skills", ["dotnetnuke"]),
    ("Drafting", "hard_skills", ["drafting"]),
    ("Drains", "hard_skills", ["drains"]),
    ("Drones", "hard_skills", ["drones"]),
    ("Drupal", "hard_skills", ["drupal"]),
    ("Dthreejs", "hard_skills", ["dthreejs"]),
    ("Dutch", "hard_skills", ["dutch"]),
    ("Dynamics", "hard_skills", ["dynamics"]),
    ("eBay", "hard_skills", ["ebay"]),
    ("eBooks", "hard_skills", ["ebooks"]),
    ("eCommerce", "hard_skills", ["ecommerce"]),
    ("Editing", "hard_skills", ["editing"]),
    ("Education / Tutoring", "hard_skills", ["education / tutoring", "education", "tutoring"]),
    ("edX", "hard_skills", ["edx"]),
    ("eLearning", "hard_skills", ["elearning"]),
    ("eLearning Designer", "hard_skills", ["elearning designer"]),
    ("Electrical Engineering", "hard_skills", ["electrical engineering"]),
    ("Electricians", "hard_skills", ["electricians"]),
    ("Electronic Forms", "hard_skills", ["electronic forms"]),
    ("Electronics", "hard_skills", ["electronics"]),
    ("Email Developer", "hard_skills", ["email developer"]),
    ("Email Handling", "hard_skills", ["email handling"]),
    ("Email Marketing", "soft_skills", ["email marketing"]),
    ("Embedded Software", "hard_skills", ["embedded software"]),
    ("Ember.js", "hard_skills", ["ember.js"]),
    ("Employment Law", "hard_skills", ["employment law"]),
    ("Energy", "hard_skills", ["energy"]),
    ("Engineering", "hard_skills", ["engineering"]),
    ("Engineering Drawing", "hard_skills", ["engineering drawing"]),
    ("English (UK)", "hard_skills", ["english (uk)", "english", "uk"]),
    ("English (US)", "hard_skills", ["english (us)", "us"]),
    ("English Grammar", "hard_skills", ["english grammar"]),
    ("English Spelling", "hard_skills", ["english spelling"]),
    ("Entrepreneurship", "hard_skills", ["entrepreneurship"]),
    ("ePub", "hard_skills", ["epub"]),
    ("Equipment Hire", "hard_skills", ["equipment hire"]),
    ("Erlang", "hard_skills", ["erlang"]),
    ("ERP", "hard_skills", ["erp"]),
    ("Estonian", "hard_skills", ["estonian"]),
    ("Etsy", "hard_skills", ["etsy"]),
    ("Event Planning", "hard_skills", ["event planning"]),
    ("Event Staffing", "hard_skills", ["event staffing"]),
    ("Excavation", "hard_skills", ["excavation"]),
    ("Excel", "hard_skills", ["excel"]),
    ("Express JS", "hard_skills", ["express js"]),
    ("Expression Engine", "hard_skills", ["expression engine"]),
    ("Extensions / Additions", "hard_skills", ["extensions / additions", "extensions", "additions"]),
    ("Face Recognition", "hard_skills", ["face recognition"]),
    ("Facebook Marketing", "soft_skills", ["facebook marketing"]),
    ("Fashion Design", "hard_skills", ["fashion design"]),
    ("Fashion Modeling", "hard_skills", ["fashion modeling"]),
    ("Fencing", "hard_skills", ["fencing"]),
    ("Feng Shui", "hard_skills", ["feng shui"]),
    ("Fiction", "hard_skills", ["fiction"]),
    ("FileMaker", "hard_skills", ["filemaker"]),
    ("Filipino", "hard_skills", ["filipino"]),
    ("Filmmaking", "hard_skills", ["filmmaking"]),
    ("Final Cut Pro", "hard_skills", ["final cut pro"]),
    ("Finale / Sibelius", "hard_skills", ["finale / sibelius", "finale", "sibelius"]),
    ("Finance", "soft_skills", ["finance"]),
    ("Financial Analysis", "hard_skills", ["financial analysis"]),
    ("Financial Markets", "hard_skills", ["financial markets"]),
    ("Financial Planning", "hard_skills", ["financial planning"]),
    ("Financial Research", "hard_skills", ["financial research"]),
    ("Finite Element Analysis", "hard_skills", ["finite element analysis"]),
    ("Finnish", "hard_skills", ["finnish"]),
    ("Firefox", "hard_skills", ["firefox"]),
    ("Flash 3D", "hard_skills", ["flash 3d"]),
    ("Flashmob", "hard_skills", ["flashmob"]),
    ("Flex", "hard_skills", ["flex"]),
    ("Floor Coatings", "hard_skills", ["floor coatings"]),
    ("Flooring", "hard_skills", ["flooring"]),
    ("Flow Charts", "hard_skills", ["flow charts"]),
    ("Flyer Design", "hard_skills", ["flyer design"]),
    ("Flyscreens", "hard_skills", ["flyscreens"]),
    ("Food Takeaway", "hard_skills", ["food takeaway"]),
    ("Format / Layout", "hard_skills", ["format / layout", "format", "layout"]),
    ("Fortran", "hard_skills", ["fortran"]),
    ("Forum Posting", "hard_skills", ["forum posting"]),
    ("Forum Software", "hard_skills", ["forum software"]),
    ("FPGA", "hard_skills", ["fpga"]),
    ("Frames / Trusses", "hard_skills", ["frames / trusses", "frames", "trusses"]),
    ("Freelance", "hard_skills", ["freelance"]),
    ("FreelancerAPI", "tools", ["freelancerapi"]),
    ("FreeSwitch", "hard_skills", ["freeswitch"]),
    ("French", "hard_skills", ["french"]),
    ("French (Canadian)", "hard_skills", ["french (canadian)", "canadian"]),
    ("Fundraising", "hard_skills", ["fundraising"]),
    ("Furniture Assembly", "hard_skills", ["furniture assembly"]),
    ("Furniture Design", "hard_skills", ["furniture design"]),
    ("Game Consoles", "hard_skills", ["game consoles"]),
    ("Game Design", "hard_skills", ["game design"]),
    ("Game Development", "hard_skills", ["game development"]),
    ("GameSalad", "hard_skills", ["gamesalad"]),
    ("Gamification", "hard_skills", ["gamification"]),
    ("GarageBand", "hard_skills", ["garageband"]),
    ("Gardening", "hard_skills", ["gardening"]),
    ("Gas Fitting", "hard_skills", ["gas fitting"]),
    ("Genealogy", "hard_skills", ["genealogy"]),
    ("General Labor", "hard_skills", ["general labor"]),
    ("General Office", "hard_skills", ["general office"]),
    ("Genetic Engineering", "hard_skills", ["genetic engineering"]),
    ("Geolocation", "hard_skills", ["geolocation"]),
    ("Geology", "hard_skills", ["geology"]),
    ("Geospatial", "hard_skills", ["geospatial"]),
    ("Geotechnical Engineering", "hard_skills", ["geotechnical engineering"]),
    ("Ghostwriting", "soft_skills", ["ghostwriting"]),
    ("GIMP", "hard_skills", ["gimp"]),
    ("Glass / Mirror / Glazing", "hard_skills", ["glass / mirror / glazing", "glass", "mirror", "glazing"]),
    ("Golang", "hard_skills", ["golang"]),
    ("Google Adsense", "hard_skills", ["google adsense"]),
    ("Google Adwords", "hard_skills", ["google adwords"]),
    ("Google Analytics", "hard_skills", ["google analytics"]),
    ("Google App Engine", "hard_skills", ["google app engine"]),
    ("Google Cardboard", "hard_skills", ["google cardboard"]),
    ("Google Chrome", "hard_skills", ["google chrome"]),
    ("Google Cloud Storage", "tools", ["google cloud storage"]),
    ("Google Earth", "hard_skills", ["google earth"]),
    ("Google Maps API", "tools", ["google maps api"]),
    ("Google Plus", "hard_skills", ["google plus"]),
    ("Google SketchUp", "hard_skills", ["google sketchup"]),
    ("Google Web Toolkit", "tools", ["google web toolkit"]),
    ("Google Webmaster Tools", "tools", ["google webmaster tools"]),
    ("Google Website Optimizer", "hard_skills", ["google website optimizer"]),
    ("GoPro", "hard_skills", ["gopro"]),
    ("GPGPU", "hard_skills", ["gpgpu"]),
    ("GPS", "hard_skills", ["gps"]),
    ("Grails", "hard_skills", ["grails"]),
    ("Grant Writing", "soft_skills", ["grant writing"]),
    ("Graphic Design", "hard_skills", ["graphic design"]),
    ("Grease Monkey", "hard_skills", ["grease monkey"]),
    ("Greek", "hard_skills", ["greek"]),
    ("Growth Hacking", "hard_skills", ["growth hacking"]),
    ("Grunt", "hard_skills", ["grunt"]),
    ("Guttering", "hard_skills", ["guttering"]),
    ("Hair Styles", "hard_skills", ["hair styles"]),
    ("Handyman", "hard_skills", ["handyman"]),
    ("HBase", "hard_skills", ["hbase"]),
    ("Health", "hard_skills", ["health"]),
    ("Heating Systems", "hard_skills", ["heating systems"]),
    ("Hebrew", "hard_skills", ["hebrew"]),
    ("Helpdesk", "hard_skills", ["helpdesk"]),
    ("Heroku", "hard_skills", ["heroku"]),
    ("Hindi", "hard_skills", ["hindi"]),
    ("Hire me", "hard_skills", ["hire me"]),
    ("History", "hard_skills", ["history"]),
    ("Hive", "hard_skills", ["hive"]),
    ("Home Automation", "hard_skills", ["home automation"]),
    ("Home Design", "hard_skills", ["home design"]),
    ("Home Organization", "hard_skills", ["home organization"]),
    ("HomeKit", "hard_skills", ["homekit"]),
    ("Hot Water", "hard_skills", ["hot water"]),
    ("House Cleaning", "hard_skills", ["house cleaning"]),
    ("Housework", "hard_skills", ["housework"]),
    ("HP Openview", "hard_skills", ["hp openview"]),
    ("HTML5", "hard_skills", ["html5"]),
    ("Human Resources", "hard_skills", ["human resources"]),
    ("Human Sciences", "hard_skills", ["human sciences"]),
    ("Hungarian", "hard_skills", ["hungarian"]),
    ("iBeacon", "hard_skills", ["ibeacon"]),
    ("IBM BPM", "hard_skills", ["ibm bpm"]),
    ("IBM Tivoli", "hard_skills", ["ibm tivoli"]),
    ("IBM Websphere Transformation Tool", "tools", ["ibm websphere transformation tool"]),
    ("Icon Design", "hard_skills", ["icon design"]),
    ("IIS", "hard_skills", ["iis"]),
    ("IKEA Installation", "hard_skills", ["ikea installation"]),
    ("Illustration", "hard_skills", ["illustration"]),
    ("Illustrator", "tools", ["illustrator"]),
    ("Imaging", "hard_skills", ["imaging"]),
    ("iMovie", "hard_skills", ["imovie"]),
    ("Indonesian", "hard_skills", ["indonesian"]),
    ("Industrial Design", "hard_skills", ["industrial design"]),
    ("Industrial Engineering", "hard_skills", ["industrial engineering"]),
    ("Infographics", "hard_skills", ["infographics"]),
    ("Inspections", "hard_skills", ["inspections"]),
    ("Instagram", "hard_skills", ["instagram"]),
    ("Installation", "hard_skills", ["installation"]),
    ("Instrumentation", "hard_skills", ["instrumentation"]),
    ("Insurance", "hard_skills", ["insurance"]),
    ("Interior Design", "hard_skills", ["interior design"]),
    ("Interiors", "hard_skills", ["interiors"]),
    ("Internet Marketing", "soft_skills", ["internet marketing"]),
    ("Internet Research", "hard_skills", ["internet research"]),
    ("Internet Security", "hard_skills", ["internet security"]),
    ("Interpreter", "hard_skills", ["interpreter"]),
    ("Interspire", "hard_skills", ["interspire"]),
    ("Intuit QuickBooks", "hard_skills", ["intuit quickbooks"]),
    ("Inventory Management", "soft_skills", ["inventory management"]),
    ("Investment Research", "hard_skills", ["investment research"]),
    ("Invitation Design", "hard_skills", ["invitation design"]),
    ("Ionic Framework", "tools", ["ionic framework"]),
    ("iPad", "hard_skills", ["ipad"]),
    ("iPhone", "hard_skills", ["iphone"]),
    ("ISO9001", "hard_skills", ["iso9001"]),
    ("Italian", "hard_skills", ["italian"]),
    ("ITIL", "hard_skills", ["itil"]),
    ("J2EE", "hard_skills", ["j2ee"]),
    ("J2ME", "hard_skills", ["j2me"]),
    ("Jabber", "hard_skills", ["jabber"]),
    ("Japanese", "hard_skills", ["japanese"]),
    ("JavaFX", "hard_skills", ["javafx"]),
    ("JD Edwards CNC", "hard_skills", ["jd edwards cnc"]),
    ("JDF", "hard_skills", ["jdf"]),
    ("Jewellery", "hard_skills", ["jewellery"]),
    ("Joomla", "hard_skills", ["joomla"]),
    ("Journalist", "hard_skills", ["journalist"]),
    ("jQuery / Prototype", "hard_skills", ["jquery / prototype", "jquery", "prototype"]),
    ("JSON", "hard_skills", ["json"]),
    ("JSP", "hard_skills", ["jsp"]),
    ("Kannada", "hard_skills", ["kannada"]),
    ("Kinect", "hard_skills", ["kinect"]),
    ("Kitchen", "hard_skills", ["kitchen"]),
    ("Knockout.js", "hard_skills", ["knockout.js"]),
    ("Korean", "hard_skills", ["korean"]),
    ("Label Design", "hard_skills", ["label design"]),
    ("LabVIEW", "hard_skills", ["labview"]),
    ("Landing Pages", "hard_skills", ["landing pages"]),
    ("Landscape Design", "hard_skills", ["landscape design"]),
    ("Landscaping", "tools", ["landscaping"]),
    ("Landscaping / Gardening", "tools", ["landscaping / gardening"]),
    ("LaTeX", "hard_skills", ["latex"]),
    ("Latvian", "hard_skills", ["latvian"]),
    ("Laundry and Ironing", "hard_skills", ["laundry and ironing"]),
    ("Lawn Mowing", "hard_skills", ["lawn mowing"]),
    ("Leads", "hard_skills", ["leads"]),
    ("Leap Motion SDK", "tools", ["leap motion sdk"]),
    ("Legal", "soft_skills", ["legal"]),
    ("Legal Research", "soft_skills", ["legal research"]),
    ("Legal Writing", "soft_skills", ["legal writing"]),
    ("LESS/Sass/SCSS", "hard_skills", ["less/sass/scss", "less", "sass", "scss"]),
    ("Life Coaching", "soft_skills", ["life coaching"]),
    ("Lighting", "hard_skills", ["lighting"]),
    ("Linear Programming", "hard_skills", ["linear programming", "linear"]),
    ("Link Building", "hard_skills", ["link building"]),
    ("Linkedin", "hard_skills", ["linkedin"]),
    ("Linnworks Order Management", "soft_skills", ["linnworks order management"]),
    ("LINQ", "hard_skills", ["linq"]),
    ("Lisp", "hard_skills", ["lisp"]),
    ("Lithuanian", "hard_skills", ["lithuanian"]),
    ("LiveCode", "hard_skills", ["livecode"]),
    ("Locksmith", "hard_skills", ["locksmith"]),
    ("Logistics / Shipping", "hard_skills", ["logistics / shipping", "logistics", "shipping"]),
    ("Logo Design", "hard_skills", ["logo design"]),
    ("Lotus Notes", "hard_skills", ["lotus notes"]),
    ("Mac OS", "hard_skills", ["mac os"]),
    ("Macedonian", "hard_skills", ["macedonian"]),
    ("Magento", "hard_skills", ["magento"]),
    ("Magic Leap", "hard_skills", ["magic leap"]),
    ("Mailchimp", "hard_skills", ["mailchimp"]),
    ("Mailwizz", "hard_skills", ["mailwizz"]),
    ("Make Up", "hard_skills", ["make up"]),
    ("Makerbot", "hard_skills", ["makerbot"]),
    ("Malay", "hard_skills", ["malay"]),
    ("Malayalam", "hard_skills", ["malayalam"]),
    ("Maltese", "hard_skills", ["maltese"]),
    ("Management", "soft_skills", ["management"]),
    ("Manufacturing", "hard_skills", ["manufacturing"]),
    ("Manufacturing Design", "hard_skills", ["manufacturing design"]),
    ("Map Reduce", "hard_skills", ["map reduce"]),
    ("MariaDB", "hard_skills", ["mariadb"]),
    ("Market Research", "hard_skills", ["market research"]),
    ("Marketing", "soft_skills", ["marketing"]),
    ("Marketplace Service", "soft_skills", ["marketplace service"]),
    ("Materials Engineering", "hard_skills", ["materials engineering"]),
    ("Mathematics", "hard_skills", ["mathematics"]),
    ("Matlab and Mathematica", "hard_skills", ["matlab and mathematica"]),
    ("Maya", "tools", ["maya"]),
    ("Mechanical Engineering", "hard_skills", ["mechanical engineering"]),
    ("Mechatronics", "hard_skills", ["mechatronics"]),
    ("Medical", "hard_skills", ["medical"]),
    ("Medical Writing", "soft_skills", ["medical writing"]),
    ("Metatrader", "hard_skills", ["metatrader"]),
    ("MeteorJS", "hard_skills", ["meteorjs"]),
    ("Metro", "hard_skills", ["metro"]),
    ("Microbiology", "hard_skills", ["microbiology"]),
    ("Microcontroller", "hard_skills", ["microcontroller"]),
    ("Microsoft", "hard_skills", ["microsoft"]),
    ("Microsoft Access", "hard_skills", ["microsoft access"]),
    ("Microsoft Exchange", "hard_skills", ["microsoft exchange"]),
    ("Microsoft Expression", "hard_skills", ["microsoft expression"]),
    ("Microsoft Hololens", "hard_skills", ["microsoft hololens"]),
    ("Microsoft Office", "hard_skills", ["microsoft office"]),
    ("Microsoft Outlook", "hard_skills", ["microsoft outlook"]),
    ("Microsoft SQL Server", "tools", ["microsoft sql server"]),
    ("Microsoft Visio", "hard_skills", ["microsoft visio"]),
    ("Microstation", "hard_skills", ["microstation"]),
    ("Millwork", "hard_skills", ["millwork"]),
    ("Mining Engineering", "hard_skills", ["mining engineering"]),
    ("Minitlab", "hard_skills", ["minitlab"]),
    ("MLM", "hard_skills", ["mlm"]),
    ("MMORPG", "hard_skills", ["mmorpg"]),
    ("Mobile App Testing", "hard_skills", ["mobile app testing"]),
    ("Mobile Phone", "hard_skills", ["mobile phone"]),
    ("MODx", "hard_skills", ["modx"]),
    ("MonetDB", "hard_skills", ["monetdb"]),
    ("Moodle", "hard_skills", ["moodle"]),
    ("Mortgage Brokering", "hard_skills", ["mortgage brokering"]),
    ("Motion Graphics", "hard_skills", ["motion graphics"]),
    ("Moving", "hard_skills", ["moving"]),
    ("MQTT", "hard_skills", ["mqtt"]),
    ("Mural Painting", "hard_skills", ["mural painting"]),
    ("Music", "hard_skills", ["music"]),
    ("MVC", "hard_skills", ["mvc"]),
    ("MYOB", "hard_skills", ["myob"]),
    ("MySpace", "hard_skills", ["myspace"]),
    ("Nanotechnology", "hard_skills", ["nanotechnology"]),
    ("Natural Language", "hard_skills", ["natural language"]),
    ("Network Administration", "hard_skills", ["network administration"]),
    ("Newsletters", "hard_skills", ["newsletters"]),
    ("Ning", "hard_skills", ["ning"]),
    ("Nintex Forms", "hard_skills", ["nintex forms"]),
    ("Nintex Workflow", "hard_skills", ["nintex workflow"]),
    ("Nokia", "hard_skills", ["nokia"]),
    ("Norwegian", "hard_skills", ["norwegian"]),
    ("NoSQL Couch / Mongo", "hard_skills", ["nosql couch / mongo", "nosql couch", "mongo"]),
    ("Nutrition", "hard_skills", ["nutrition"]),
    ("Objective C", "hard_skills", ["objective c"]),
    ("OCR", "hard_skills", ["ocr"]),
    ("Oculus Mobile SDK", "tools", ["oculus mobile sdk"]),
    ("Odoo", "hard_skills", ["odoo"]),
    ("Online Writing", "soft_skills", ["online writing"]),
    ("Open Cart", "hard_skills", ["open cart"]),
    ("Open Journal Systems", "hard_skills", ["open journal systems"]),
    ("OpenBravo", "hard_skills", ["openbravo"]),
    ("OpenCL", "hard_skills", ["opencl"]),
    ("OpenGL", "hard_skills", ["opengl"]),
    ("OpenSceneGraph", "hard_skills", ["openscenegraph"]),
    ("OpenSSL", "hard_skills", ["openssl"]),
    ("OpenStack", "hard_skills", ["openstack"]),
    ("OpenVMS", "hard_skills", ["openvms"]),
    ("Oracle", "tools", ["oracle"]),
    ("Order Processing", "hard_skills", ["order processing"]),
    ("Organizational Change Management", "soft_skills", ["organizational change management"]),
    ("OSCommerce", "hard_skills", ["oscommerce"]),
    ("Package Design", "hard_skills", ["package design"]),
    ("Packing / Shipping", "hard_skills", ["packing / shipping", "packing"]),
    ("Painting", "hard_skills", ["painting"]),
    ("Palm", "hard_skills", ["palm"]),
    ("Papiamento", "tools", ["papiamento"]),
    ("Parallax Scrolling", "hard_skills", ["parallax scrolling"]),
    ("Parallel Processing", "hard_skills", ["parallel processing"]),
    ("Parallels Automation", "hard_skills", ["parallels automation"]),
    ("Parallels Desktop", "hard_skills", ["parallels desktop"]),
    ("Patents", "hard_skills", ["patents"]),
    ("Pattern Making", "hard_skills", ["pattern making"]),
    ("Pattern Matching", "hard_skills", ["pattern matching"]),
    ("Pavement", "hard_skills", ["pavement"]),
    ("PayPal API", "tools", ["paypal api"]),
    ("Payroll", "hard_skills", ["payroll"]),
    ("Paytrace", "hard_skills", ["paytrace"]),
    ("PCB Layout", "hard_skills", ["pcb layout"]),
    ("PDF", "hard_skills", ["pdf"]),
    ("PEGA PRPC", "hard_skills", ["pega prpc"]),
    ("PencilBlue CMS", "tools", ["pencilblue cms"]),
    ("Pentaho", "hard_skills", ["pentaho"]),
    ("PeopleSoft", "hard_skills", ["peoplesoft"]),
    ("Periscope", "hard_skills", ["periscope"]),
    ("Personal Development", "hard_skills", ["personal development"]),
    ("Pest Control", "hard_skills", ["pest control"]),
    ("Pet Sitting", "hard_skills", ["pet sitting"]),
    ("Petroleum Engineering", "hard_skills", ["petroleum engineering"]),
    ("Phone Support", "soft_skills", ["phone support"]),
    ("PhoneGap", "hard_skills", ["phonegap"]),
    ("Photo Editing", "hard_skills", ["photo editing"]),
    ("Photography", "hard_skills", ["photography"]),
    ("Photoshop", "tools", ["photoshop"]),
    ("Photoshop Coding", "tools", ["photoshop coding"]),
    ("Photoshop Design", "tools", ["photoshop design"]),
    ("Physics", "hard_skills", ["physics"]),
    ("PICK Multivalue DB", "hard_skills", ["pick multivalue db"]),
    ("Pickup", "hard_skills", ["pickup"]),
    ("Pinterest", "hard_skills", ["pinterest"]),
    ("Piping", "hard_skills", ["piping"]),
    ("PLC / SCADA", "hard_skills", ["plc / scada", "plc", "scada"]),
    ("Plesk", "hard_skills", ["plesk"]),
    ("Plugin", "hard_skills", ["plugin"]),
    ("Plumbing", "hard_skills", ["plumbing"]),
    ("Poet", "hard_skills", ["poet"]),
    ("Poetry", "hard_skills", ["poetry"]),
    ("Polish", "hard_skills", ["polish"]),
    ("Portuguese", "hard_skills", ["portuguese"]),
    ("Portuguese (Brazil)", "hard_skills", ["portuguese (brazil)", "brazil"]),
    ("Post-Production", "hard_skills", ["post-production"]),
    ("Poster Design", "hard_skills", ["poster design"]),
    ("Powerpoint", "hard_skills", ["powerpoint"]),
    ("Pre-production", "hard_skills", ["pre-production"]),
    ("Presentations", "soft_skills", ["presentations"]),
    ("Press Releases", "hard_skills", ["press releases"]),
    ("Prestashop", "hard_skills", ["prestashop"]),
    ("Prezi", "hard_skills", ["prezi"]),
    ("Print", "hard_skills", ["print"]),
    ("Procurement", "hard_skills", ["procurement"]),
    ("Product Descriptions", "hard_skills", ["product descriptions"]),
    ("Product Design", "hard_skills", ["product design"]),
    ("Product Management", "soft_skills", ["product management"]),
    ("Product Sourcing", "hard_skills", ["product sourcing"]),
    ("Programming", "hard_skills", ["programming"]),
    ("Project Management", "soft_skills", ["project management"]),
    ("Project Scheduling", "hard_skills", ["project scheduling"]),
    ("Prolog", "hard_skills", ["prolog"]),
    ("Proofreading", "hard_skills", ["proofreading"]),
    ("Property Development", "hard_skills", ["property development"]),
    ("Property Law", "hard_skills", ["property law"]),
    ("Property Management", "soft_skills", ["property management"]),
    ("Proposal/Bid Writing", "soft_skills", ["proposal/bid writing", "proposal", "bid writing"]),
    ("Protoshare", "hard_skills", ["protoshare"]),
    ("PSD to HTML", "hard_skills", ["psd to html"]),
    ("PSD2CMS", "tools", ["psd2cms"]),
    ("Psychology", "hard_skills", ["psychology"]),
    ("Public Relations", "hard_skills", ["public relations"]),
    ("Publishing", "hard_skills", ["publishing"]),
    ("Punjabi", "hard_skills", ["punjabi"]),
    ("Puppet", "hard_skills", ["puppet"]),
    ("QlikView", "hard_skills", ["qlikview"]),
    ("Qualtrics Survey Platform", "tools", ["qualtrics survey platform"]),
    ("Quantum", "hard_skills", ["quantum"]),
    ("QuarkXPress", "hard_skills", ["quarkxpress"]),
    ("QuickBase", "hard_skills", ["quickbase"]),
    ("R Programming Language", "hard_skills", ["r programming language"]),
    ("RapidWeaver", "tools", ["rapidweaver"]),
    ("Raspberry Pi", "hard_skills", ["raspberry pi"]),
    ("Ray-tracing", "hard_skills", ["ray-tracing"]),
    ("React.js", "hard_skills", ["react.js"]),
    ("Real Estate", "hard_skills", ["real estate"]),
    ("REALbasic", "hard_skills", ["realbasic"]),
    ("Recruitment", "soft_skills", ["recruitment"]),
    ("Red Hat", "hard_skills", ["red hat"]),
    ("Redshift", "hard_skills", ["redshift"]),
    ("Regular Expressions", "hard_skills", ["regular expressions"]),
    ("Remote Sensing", "hard_skills", ["remote sensing"]),
    ("Removalist", "hard_skills", ["removalist"]),
    ("Renewable Energy Design", "hard_skills", ["renewable energy design"]),
    ("Report Writing", "soft_skills", ["report writing"]),
    ("Research", "hard_skills", ["research"]),
    ("RESTful", "hard_skills", ["restful"]),
    ("Resumes", "hard_skills", ["resumes"]),
    ("Reviews", "hard_skills", ["reviews"]),
    ("Risk Management", "soft_skills", ["risk management"]),
    ("Robotics", "hard_skills", ["robotics"]),
    ("Rocket Engine", "hard_skills", ["rocket engine"]),
    ("Romanian", "hard_skills", ["romanian"]),
    ("Roofing", "hard_skills", ["roofing"]),
    ("RTOS", "hard_skills", ["rtos"]),
    ("Russian", "hard_skills", ["russian"]),
    ("RWD", "hard_skills", ["rwd"]),
    ("Sales", "hard_skills", ["sales"]),
    ("Salesforce App Development", "tools", ["salesforce app development"]),
    ("Salesforce.com", "tools", ["salesforce.com"]),
    ("Samsung", "hard_skills", ["samsung"]),
    ("Samsung Accessory SDK", "tools", ["samsung accessory sdk"]),
    ("SAP", "tools", ["sap"]),
    ("SAS", "hard_skills", ["sas"]),
    ("Scheme", "hard_skills", ["scheme"]),
    ("Scientific Research", "hard_skills", ["scientific research"]),
    ("Screenwriting", "soft_skills", ["screenwriting"]),
    ("Script Install", "hard_skills", ["script install"]),
    ("Scrum Development", "soft_skills", ["scrum development"]),
    ("Sculpturing", "hard_skills", ["sculpturing"]),
    ("Search Engine Marketing", "soft_skills", ["search engine marketing"]),
    ("Sencha / YahooUI", "hard_skills", ["sencha / yahooui", "sencha", "yahooui"]),
    ("SEO", "hard_skills", ["seo"]),
    ("Serbian", "hard_skills", ["serbian"]),
    ("Sewing", "hard_skills", ["sewing"]),
    ("Sharepoint", "hard_skills", ["sharepoint"]),
    ("Shell Script", "hard_skills", ["shell script"]),
    ("Shopify", "tools", ["shopify"]),
    ("Shopify Templates", "tools", ["shopify templates"]),
    ("Shopping", "hard_skills", ["shopping"]),
    ("Shopping Carts", "hard_skills", ["shopping carts"]),
    ("Short Stories", "hard_skills", ["short stories"]),
    ("Siebel", "hard_skills", ["siebel"]),
    ("Sign Design", "hard_skills", ["sign design"]),
    ("Silverlight", "hard_skills", ["silverlight"]),
    ("Simplified Chinese (China)", "hard_skills", ["simplified chinese (china)", "simplified chinese", "china"]),
    ("Slogans", "hard_skills", ["slogans"]),
    ("Slovakian", "hard_skills", ["slovakian"]),
    ("Slovenian", "hard_skills", ["slovenian"]),
    ("Smarty PHP", "hard_skills", ["smarty php"]),
    ("Snapchat", "hard_skills", ["snapchat"]),
    ("Social Engine", "hard_skills", ["social engine"]),
    ("Social Media Marketing", "soft_skills", ["social media marketing"]),
    ("Social Networking", "hard_skills", ["social networking"]),
    ("Socket IO", "hard_skills", ["socket io"]),
    ("Software Architecture", "hard_skills", ["software architecture"]),
    ("Software Development", "hard_skills", ["software development"]),
    ("Software Testing", "hard_skills", ["software testing"]),
    ("Solaris", "hard_skills", ["solaris"]),
    ("Solidworks", "hard_skills", ["solidworks"]),
    ("Sound Design", "hard_skills", ["sound design"]),
    ("Spanish", "hard_skills", ["spanish"]),
    ("Spanish (Spain)", "hard_skills", ["spanish (spain)", "spain"]),
    ("Speech Writing", "soft_skills", ["speech writing"]),
    ("Sphinx", "hard_skills", ["sphinx"]),
    ("Splunk", "hard_skills", ["splunk"]),
    ("Sports", "hard_skills", ["sports"]),
    ("SPSS Statistics", "hard_skills", ["spss statistics"]),
    ("Squarespace", "hard_skills", ["squarespace"]),
    ("Squid Cache", "hard_skills", ["squid cache"]),
    ("Startups", "hard_skills", ["startups"]),
    ("Stationery Design", "hard_skills", ["stationery design"]),
    ("Statistical Analysis", "hard_skills", ["statistical analysis"]),
    ("Statistics", "hard_skills", ["statistics"]),
    ("Steam API", "soft_skills", ["steam api"]),
    ("Sticker Design", "hard_skills", ["sticker design"]),
    ("Storage Area Networks", "hard_skills", ["storage area networks"]),
    ("Storyboard", "hard_skills", ["storyboard"]),
    ("Stripe", "hard_skills", ["stripe"]),
    ("Strapi CMS", "tools", ["strapi cms"]),
    ("Structural Engineering", "hard_skills", ["structural engineering"]),
    ("Subversion", "hard_skills", ["subversion"]),
    ("SugarCRM", "hard_skills", ["sugarcrm"]),
    ("Supplier Sourcing", "hard_skills", ["supplier sourcing"]),
    ("Surfboard Design", "hard_skills", ["surfboard design"]),
    ("Swedish", "hard_skills", ["swedish"]),
    ("Symbian", "hard_skills", ["symbian"]),
    ("Symfony PHP", "hard_skills", ["symfony php"]),
    ("System Admin", "hard_skills", ["system admin"]),
    ("T-Shirts", "hard_skills", ["t-shirts"]),
    ("Tableau", "hard_skills", ["tableau"]),
    ("Tally Definition Language", "hard_skills", ["tally definition language"]),
    ("Tamil", "hard_skills", ["tamil"]),
    ("TaoBao API", "tools", ["taobao api"]),
    ("Tattoo Design", "hard_skills", ["tattoo design"]),
    ("Tax", "hard_skills", ["tax"]),
    ("Tax Law", "hard_skills", ["tax law"]),
    ("Technical Support", "soft_skills", ["technical support"]),
    ("Technical Writing", "soft_skills", ["technical writing"]),
    ("Tekla Structures", "hard_skills", ["tekla structures"]),
    ("Telecommunications Engineering", "soft_skills", ["telecommunications engineering"]),
    ("Telemarketing", "soft_skills", ["telemarketing"]),
    ("Telephone Handling", "hard_skills", ["telephone handling"]),
    ("Telugu", "hard_skills", ["telugu"]),
    ("Templates", "hard_skills", ["templates"]),
    ("Test Automation", "hard_skills", ["test automation"]),
    ("Testing / QA", "hard_skills", ["testing / qa", "testing", "qa"]),
    ("TestStand", "hard_skills", ["teststand"]),
    ("Textile Engineering", "hard_skills", ["textile engineering"]),
    ("Thai", "hard_skills", ["thai"]),
    ("Tibco Spotfire", "hard_skills", ["tibco spotfire"]),
    ("Tiling", "hard_skills", ["tiling"]),
    ("Titanium", "hard_skills", ["titanium"]),
    ("Tizen SDK for Wearables", "tools", ["tizen sdk for wearables"]),
    ("Traditional Chinese (Hong Kong)", "hard_skills", ["traditional chinese (hong kong)", "traditional chinese", "hong kong"]),
    ("Traditional Chinese (Taiwan)", "hard_skills", ["traditional chinese (taiwan)", "taiwan"]),
    ("Training", "soft_skills", ["training"]),
    ("Transcription", "hard_skills", ["transcription"]),
    ("Translation", "soft_skills", ["translation"]),
    ("Travel Writing", "soft_skills", ["travel writing"]),
    ("Troubleshooting", "hard_skills", ["troubleshooting"]),
    ("Tumblr", "hard_skills", ["tumblr"]),
    ("Turkish", "hard_skills", ["turkish"]),
    ("Twitter", "hard_skills", ["twitter"]),
    ("TYPO3", "hard_skills", ["typo3"]),
    ("Typography", "hard_skills", ["typography"]),
    ("Ubuntu", "hard_skills", ["ubuntu"]),
    ("Ukrainian", "hard_skills", ["ukrainian"]),
    ("Umbraco", "hard_skills", ["umbraco"]),
    ("UML Design", "hard_skills", ["uml design"]),
    ("Unit4 Business World", "hard_skills", ["unit4 business world"]),
    ("Unity 3D", "tools", ["unity 3d"]),
    ("UNIX", "hard_skills", ["unix"]),
    ("Urdu", "hard_skills", ["urdu"]),
    ("Usability Testing", "hard_skills", ["usability testing"]),
    ("User Experience Design", "hard_skills", ["user experience design", "ux"]),
    ("User Interface / IA", "hard_skills", ["user interface / ia", "user interface"]),
    ("User Interface Design", "hard_skills", ["user interface design", "ui"]),
    ("Valuation / Appraisal", "hard_skills", ["valuation / appraisal", "valuation", "appraisal"]),
    ("Varnish Cache", "hard_skills", ["varnish cache"]),
    ("VB.NET", "hard_skills", ["vb.net"]),
    ("vBulletin", "hard_skills", ["vbulletin"]),
    ("Vectorization", "hard_skills", ["vectorization"]),
    ("Veeam", "hard_skills", ["veeam"]),
    ("Vehicle Signage", "hard_skills", ["vehicle signage"]),
    ("Verilog", "hard_skills", ["verilog"]),
    ("VHDL", "hard_skills", ["vhdl"]),
    ("VertexFX", "hard_skills", ["vertexfx"]),
    ("Video Broadcasting", "tools", ["video broadcasting"]),
    ("Video Editing", "tools", ["video editing"]),
    ("Video Production", "tools", ["video production"]),
    ("Video Services", "soft_skills", ["video services"]),
    ("Video Upload", "tools", ["video upload"]),
    ("Videography", "tools", ["videography"]),
    ("Vietnamese", "hard_skills", ["vietnamese"]),
    ("Viral Marketing", "soft_skills", ["viral marketing"]),
    ("Virtual Assistant", "hard_skills", ["virtual assistant"]),
    ("Virtual Worlds", "hard_skills", ["virtual worlds", "vr"]),
    ("Virtuemart", "hard_skills", ["virtuemart"]),
    ("Virtuozzo", "hard_skills", ["virtuozzo"]),
    ("Visa / Immigration", "hard_skills", ["visa / immigration", "visa", "immigration"]),
    ("Visual Arts", "hard_skills", ["visual arts"]),
    ("Visual Basic", "hard_skills", ["visual basic"]),
    ("Visual Basic for Apps", "hard_skills", ["visual basic for apps"]),
    ("Visual Foxpro", "hard_skills", ["visual foxpro"]),
    ("Visual Merchandising", "hard_skills", ["visual merchandising"]),
    ("Visualization", "hard_skills", ["visualization"]),
    ("VMware", "hard_skills", ["vmware"]),
    ("Voice Artist", "hard_skills", ["voice artist"]),
    ("Voice Talent", "hard_skills", ["voice talent"]),
    ("VoiceXML", "hard_skills", ["voicexml"]),
    ("VoIP", "hard_skills", ["voip"]),
    ("Volusion", "hard_skills", ["volusion"]),
    ("VPS", "hard_skills", ["vps"]),
    ("vTiger", "hard_skills", ["vtiger"]),
    ("Vuforia", "hard_skills", ["vuforia"]),
    ("WatchKit", "hard_skills", ["watchkit"]),
    ("Web Hosting", "hard_skills", ["web hosting"]),
    ("Web Scraping", "tools", ["web scraping"]),
    ("Web Search", "hard_skills", ["web search"]),
    ("Web Security", "hard_skills", ["web security"]),
    ("Web Services", "soft_skills", ["web services"]),
    ("webMethods", "hard_skills", ["webmethods"]),
    ("WebOS", "hard_skills", ["webos"]),
    ("Website Design", "hard_skills", ["website design"]),
    ("Website Management", "soft_skills", ["website management"]),
    ("Website Testing", "hard_skills", ["website testing"]),
    ("Weddings", "hard_skills", ["weddings"]),
    ("Weebly", "hard_skills", ["weebly"]),
    ("Welsh", "hard_skills", ["welsh"]),
    ("WHMCS", "hard_skills", ["whmcs"]),
    ("WIKI", "hard_skills", ["wiki"]),
    ("Wikipedia", "hard_skills", ["wikipedia"]),
    ("Windows 8", "hard_skills", ["windows 8"]),
    ("Windows API", "tools", ["windows api"]),
    ("Windows CE", "hard_skills", ["windows ce"]),
    ("Windows Desktop", "hard_skills", ["windows desktop"]),
    ("Windows Mobile", "hard_skills", ["windows mobile"]),
    ("Windows Phone", "hard_skills", ["windows phone"]),
    ("Windows Server", "tools", ["windows server"]),
    ("Wireframes", "hard_skills", ["wireframes"]),
    ("Wireless", "hard_skills", ["wireless"]),
    ("Wix", "hard_skills", ["wix"]),
    ("Wolfram", "hard_skills", ["wolfram"]),
    ("WooCommerce", "hard_skills", ["woocommerce"]),
    ("Word", "hard_skills", ["word"]),
    ("Word Processing", "hard_skills", ["word processing"]),
    ("WordPress", "tools", ["wordpress"]),
    ("Workshops", "hard_skills", ["workshops"]),
    ("WPF", "hard_skills", ["wpf"]),
    ("Wufoo", "hard_skills", ["wufoo"]),
    ("x86/x64 Assembler", "hard_skills", ["x86/x64 assembler", "x86", "x64 assembler"]),
    ("Xero", "hard_skills", ["xero"]),
    ("XML", "hard_skills", ["xml"]),
    ("XMPP", "hard_skills", ["xmpp"]),
    ("Xojo", "hard_skills", ["xojo"]),
    ("Xoops", "hard_skills", ["xoops"]),
    ("XPages", "hard_skills", ["xpages"]),
    ("XQuery", "hard_skills", ["xquery"]),
    ("XSLT", "hard_skills", ["xslt"]),
    ("Yahoo! Store Design", "hard_skills", ["yahoo! store design"]),
    ("Yard Work / Removal", "hard_skills", ["yard work / removal", "yard work", "removal"]),
    ("Yarn", "hard_skills", ["yarn"]),
    ("Yiddish", "hard_skills", ["yiddish"]),
    ("Yii", "hard_skills", ["yii"]),
    ("YouTube", "hard_skills", ["youtube"]),
    ("Zbrush", "hard_skills", ["zbrush"]),
    ("Zen Cart", "hard_skills", ["zen cart"]),
    ("Zend", "hard_skills", ["zend"]),
    ("Zendesk", "hard_skills", ["zendesk"]),
    ("Zesty CMS", "tools", ["zesty cms"]),
    ("Zoho", "hard_skills", ["zoho"]),
]

# Build lookup structures once.
_CANONICAL_BY_ALIAS = {}   # alias(lower) -> canonical display name
_CATEGORY_BY_CANONICAL = {}  # canonical -> category
_ALIASES_BY_CANONICAL = {}   # canonical -> [aliases]
for _canon, _cat, _aliases in _TAXONOMY_RAW:
    _CATEGORY_BY_CANONICAL[_canon] = _cat
    _ALIASES_BY_CANONICAL[_canon] = [a.lower() for a in _aliases]
    for _a in _aliases:
        _CANONICAL_BY_ALIAS.setdefault(_a.lower(), _canon)

def _boundary_pattern(alias_lower):
    """
    Alphanumeric-only boundaries:
      - "Java" does NOT match inside "JavaScript" (trailing S blocks).
      - "Agile/Scrum", "English + German.", "(AWS)," all still match
        (/, +, ., ,, (, ) are separators, not word chars).
      - Aliases starting/ending with a symbol (".net", "c++", "c#")
        skip that side's check so "ASP.NET" still matches ".NET".
    """
    left = r"(?<![a-z0-9])" if alias_lower[:1].isalnum() else ""
    right = r"(?![a-z0-9])" if alias_lower[-1:].isalnum() else ""
    return re.compile(left + re.escape(alias_lower) + right)


# Precompile regex per alias with alphanumeric-only boundaries.
_ALIAS_PATTERNS = []  # (compiled, canonical, alias)
# Short pure-alpha aliases ("go", "qa", "uk", "us", "ai", "ml", ...) are NOT
# matched lowercased: "go"/"us" are everyday words and would false-positive
# on every JD. They get a second, CASE-SENSITIVE pass ("QA", "UK", "Go"/"GO")
# so real skill mentions still hit but verbs/pronouns don't.
_SHORT_PATTERNS = []  # (compiled case-sensitive, canonical, alias_lower)
for _alias_lower, _canon in _CANONICAL_BY_ALIAS.items():
    # Skip dangerously short pure-alpha aliases: "go", "js", "ts", "r", ...
    # They are covered by longer aliases (golang, javascript, typescript)
    # for the lowercase pass; meaningful 2-letter ones get _SHORT_PATTERNS.
    # Exception: aliases containing non-alpha chars (c++, c#, .net, ci/cd).
    if len(_alias_lower) <= 2 and re.fullmatch(r"[a-z]+", _alias_lower):
        if len(_alias_lower) == 2:
            if _alias_lower == "go":
                _pat = re.compile(r"(?<![A-Za-z0-9])(?:Go|GO)(?![A-Za-z0-9])")
            else:
                _pat = re.compile(
                    r"(?<![A-Za-z0-9])" + re.escape(_alias_lower.upper()) + r"(?![A-Za-z0-9])"
                )
            _SHORT_PATTERNS.append((_pat, _canon, _alias_lower))
        continue
    if len(_alias_lower) <= 1:
        continue
    _ALIAS_PATTERNS.append((_boundary_pattern(_alias_lower), _canon, _alias_lower))

# Longer aliases first so multi-word hits win maintstream ties (not strictly
# needed since we collect a set, but keeps highlighting deterministic).
_ALIAS_PATTERNS.sort(key=lambda t: len(t[2]), reverse=True)


def _norm_text(text):
    if not text:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text.lower()


def _compile_kw_pattern(keyword):
    """Strict-boundary pattern for an arbitrary (possibly LLM-invented) keyword."""
    kw = (keyword or "").strip().lower()
    if not kw:
        return None
    # Same alphanumeric-only boundary rule as taxonomy matching.
    return _boundary_pattern(kw)


def extract_raw_jd_text(job_data):
    """
    Best-effort raw JD string out of whatever the views pass:
      - plain string -> itself
      - dict with job_description/description/raw_text/text/... -> joined
      - dict with only keywords lists (tailor path without raw) -> joined keywords
    """
    if job_data is None:
        return ""
    if isinstance(job_data, str):
        return job_data
    if isinstance(job_data, dict):
        for key in ("job_description", "description", "raw_text", "raw", "text", "job_text", "content"):
            val = job_data.get(key)
            if isinstance(val, str) and val.strip():
                return val
        # Fallback: join every string/list value so keyword-only dicts still
        # yield *something* scannable.
        parts = []
        for key in ("keywords", "primary_hard_skills", "secondary_soft_skills",
                    "responsibilities", "core_job_duties", "position", "company"):
            val = job_data.get(key)
            if isinstance(val, list):
                parts.extend([str(x) for x in val if x])
            elif isinstance(val, str) and val.strip():
                parts.append(val)
        if parts:
            return "\n".join(parts)
        try:
            return json.dumps(job_data, default=str)
        except Exception:
            return str(job_data)
    return str(job_data)


def extract_cv_text(profile_data):
    """Shape-agnostic: the whole CV payload lowercased (covers both master-profile
    shape and the editor's live payload shape)."""
    if profile_data is None:
        return ""
    if isinstance(profile_data, str):
        return _norm_text(profile_data)
    try:
        return _norm_text(json.dumps(profile_data, default=str))
    except Exception:
        return _norm_text(str(profile_data))


def _raw_text_of(jd_text):
    if jd_text is None:
        return ""
    return jd_text if isinstance(jd_text, str) else str(jd_text)


def extract_jd_keywords(jd_text):
    """
    Returns ordered unique canonical JD keywords found in the raw text.
    Pills use canonical display names ("REST API", "GitHub Actions",
    "Bachelor's Degree", "Vue", "Nuxt") so labels stay clean and stable.
    Order = first-appearance in text (stable, intuitive for the UI).
    Two passes: case-insensitive for normal aliases + case-sensitive for
    2-letter abbreviations (QA/UK/Go/...) so verbs/pronouns don't match.
    """
    original = _raw_text_of(jd_text)
    text = _norm_text(original)
    if not text.strip():
        return []
    found = {}  # canonical -> first index
    for pat, canon, alias in _ALIAS_PATTERNS:
        m = pat.search(text)
        if m:
            if canon not in found or m.start() < found[canon]:
                found[canon] = m.start()
    if original.strip():
        for pat, canon, alias in _SHORT_PATTERNS:
            m = pat.search(original)
            if m:
                if canon not in found or m.start() < found[canon]:
                    found[canon] = m.start()
    return sorted(found.keys(), key=lambda c: found[c])


def _raw_cv_text(profile_data):
    """Original-case CV text (for case-sensitive short-token checks)."""
    if profile_data is None:
        return ""
    if isinstance(profile_data, str):
        return profile_data
    try:
        return json.dumps(profile_data, default=str)
    except Exception:
        return str(profile_data)


def _is_short_alias(kw_lower):
    return len(kw_lower) == 2 and re.fullmatch(r"[a-z]+", kw_lower) is not None


def cv_contains(cv_text_lower, keyword_or_alias, cv_text_original=None):
    """Synonym-aware presence check of one keyword in the CV text."""
    kw = (keyword_or_alias or "").strip().lower()
    if not kw:
        return False
    # If it's a known alias, any sibling alias hitting counts as present
    # (React.js in CV satisfies React in JD and vice versa).
    canon = _CANONICAL_BY_ALIAS.get(kw)
    aliases = _ALIASES_BY_CANONICAL.get(canon, [kw]) if canon else [kw]
    for alias in aliases:
        if _is_short_alias(alias):
            # Case-sensitive: "QA"/"Go" count, "qa" verb / "go" verb don't.
            # Falls back to the lowercase text only when no original available.
            if cv_text_original:
                for pat, _c, _a in _SHORT_PATTERNS:
                    if _a == alias and pat.search(cv_text_original):
                        return True
            else:
                pat = re.compile(
                    r"(?<![A-Za-z0-9])" + re.escape(alias.upper()) + r"(?![A-Za-z0-9])"
                )
                if pat.search(cv_text_lower.upper()):
                    return True
            continue
        if _boundary_pattern(alias).search(cv_text_lower):
            return True
    # Last resort: direct strict match of the raw keyword itself
    # (covers LLM-invented multi-word phrases like "stakeholder communication").
    if not canon:
        if _is_short_alias(kw):
            if cv_text_original:
                for pat, _c, _a in _SHORT_PATTERNS:
                    if _a == kw and pat.search(cv_text_original):
                        return True
            return False
        pat = _compile_kw_pattern(kw)
        if pat and pat.search(cv_text_lower):
            return True
    return False


def classify_keywords(jd_keywords, cv_text_lower, cv_text_original=None):
    matched, missing = [], []
    for kw in jd_keywords:
        if cv_contains(cv_text_lower, kw, cv_text_original):
            matched.append(kw)
        else:
            missing.append(kw)
    return matched, missing


def category_of(keyword):
    canon = _CANONICAL_BY_ALIAS.get((keyword or "").strip().lower())
    if canon:
        return _CATEGORY_BY_CANONICAL.get(canon, "hard_skills")
    # Heuristic for LLM-only terms.
    kl = (keyword or "").lower()
    tool_hints = ("test", "tool", "platform", "framework", "library", "software",
                  "system", "cloud", "devops", "ci", "cd", "docker", "kubernetes",
                  "aws", "azure", "git", "jira")
    soft_hints = ("communication", "team", "leadership", "collaborat", "adapt",
                  "proactive", "ownership", "stakeholder", "presentation",
                  "management", "mentoring", "agile", "scrum")
    if any(h in kl for h in tool_hints):
        return "tools"
    if any(h in kl for h in soft_hints):
        return "soft_skills"
    return "hard_skills"


def _dedupe_keep_order(names):
    seen, out = set(), []
    for n in names or []:
        if not n:
            continue
        s = str(n).strip()
        if not s:
            continue
        key = s.lower()
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


def _as_name_list(value):
    """Accept backend/frontend variants: [str] | [{name}] | {cat: [...]}."""
    if not value:
        return []
    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, dict) and item.get("name"):
                out.append(str(item["name"]))
        return out
    if isinstance(value, dict):
        out = []
        for v in value.values():
            if isinstance(v, list):
                out.extend(_as_name_list(v))
        return out
    if isinstance(value, str):
        return [value]
    return []


def merge_reports(llm_report, profile_data, job_data):
    """
    Merge LLM keyword lists with the deterministic exhaustive set.

    Guarantees:
      - every taxonomy term literally present in the JD appears in exactly one
        of matched/missing (nothing silently dropped);
      - every LLM term is re-validated against the CV (fixes the common LLM
        error of listing a present skill as missing and vice versa);
      - matched ∩ missing == ∅ (matched wins on conflict);
      - all_matched / all_missing (object form the frontend renders) and the
        flat matched_keywords / missing_keywords stay consistent;
      - score/breakdown keyword component is recomputed from the merged
        coverage so the % matches the displayed pills.
    Returns the (mutated) report dict.
    """
    if not isinstance(llm_report, dict):
        llm_report = {}
    jd_text = extract_raw_jd_text(job_data)
    cv_text = extract_cv_text(profile_data)
    cv_original = _raw_cv_text(profile_data)

    det_keywords = extract_jd_keywords(jd_text)
    det_matched, det_missing = classify_keywords(det_keywords, cv_text, cv_original)

    llm_matched = _dedupe_keep_order(_as_name_list(llm_report.get("matched_keywords")))
    # Frontend sometimes sends all_matched objects only; also respect them.
    llm_matched += [d for d in _dedupe_keep_order(_as_name_list(llm_report.get("all_matched"))) if d.lower() not in {m.lower() for m in llm_matched}]
    llm_missing = _dedupe_keep_order(_as_name_list(llm_report.get("missing_keywords")))
    for obj in (llm_report.get("all_missing") or []):
        if isinstance(obj, dict) and obj.get("name"):
            if str(obj["name"]).lower() not in {m.lower() for m in llm_missing}:
                llm_missing.append(str(obj["name"]))

    # Re-validate EVERYTHING against the CV deterministically. This both adds
    # the deterministic terms the LLM omitted and corrects LLM mislabels.
    # Deterministic taxonomy hits keep their canonical display name.
    by_lower = {}
    for kw in det_keywords + llm_matched + llm_missing:
        s = str(kw).strip()
        if s and s.lower() not in by_lower:
            by_lower[s.lower()] = s

    final_matched, final_missing = [], []
    for key_lower, display in by_lower.items():
        if cv_contains(cv_text, display, cv_original):
            final_matched.append(display)
        else:
            final_missing.append(display)

    # Stable order: deterministic JD order first, then LLM extras in arrival order.
    order = [k.lower() for k in det_keywords]
    def _sort_key(name):
        try:
            return order.index(name.lower())
        except ValueError:
            return len(order) + 1
    final_matched.sort(key=_sort_key)
    final_missing.sort(key=_sort_key)

    llm_report["matched_keywords"] = final_matched
    llm_report["missing_keywords"] = final_missing
    llm_report["all_matched"] = [
        {"name": n, "category": category_of(n)} for n in final_matched
    ]
    llm_report["all_missing"] = [
        {"name": n, "category": category_of(n)} for n in final_missing
    ]

    # Recompute keyword coverage so score matches the pills the user sees.
    total = len(final_matched) + len(final_missing)
    kw_score = round((len(final_matched) / total) * 100) if total else 0
    breakdown = llm_report.get("breakdown") or {}
    try:
        bullets = float(breakdown.get("bullets", 70))
    except (TypeError, ValueError):
        bullets = 70
    try:
        structure = float(breakdown.get("structure", 75))
    except (TypeError, ValueError):
        structure = 75
    breakdown["keywords"] = kw_score
    llm_report["breakdown"] = breakdown
    try:
        final_score = int(round(0.5 * kw_score + 0.3 * bullets + 0.2 * structure))
    except Exception:
        final_score = llm_report.get("score", kw_score)
    llm_report["score"] = max(0, min(100, final_score))

    return llm_report
