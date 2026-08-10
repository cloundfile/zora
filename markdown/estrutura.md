zora/
├── .env.example
├── .npmignore
├── LICENSE
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── backups/
│   ├── daily/
│   └── monthly/
└── src/
    ├── index.ts
    ├── setup/
    │   ├── versionCheck.ts
    │   ├── initSetup.ts
    │   └── configStore.ts
    ├── commands/
    │   ├── chat.ts
    │   ├── sections.ts
    │   ├── reset.ts
    │   ├── delete.ts
    │   ├── kill.ts
    │   ├── train.ts
    │   ├── export.ts
    │   ├── restore.ts
    │   ├── version.ts
    │   └── help.ts
    ├── db/
    │   └── connection.ts
    ├── errors/
    │   └── zoraErrors.ts
    ├── utils/
    │   ├── safeAsync.ts
    │   └── errorHandler.ts
    ├── services/
    │   ├── backupService.ts
    │   ├── filePicker.ts
    │   ├── ingestion.ts
    │   ├── cnpjService.ts
    │   ├── chatService.ts
    │   └── vectorStore.ts
    └── llm/
        ├── llmFactory.ts
        ├── systemPrompt.ts
        └── providers/
            ├── ollamaProvider.ts
            ├── geminiProvider.ts
            ├── claudeProvider.ts
            └── openaiProvider.ts
└── tests/
    ├── helpers/
    │   └── testDb.ts
    ├── unit/
    │   ├── ingestion.test.ts
    │   └── version.test.ts
    └── integration/
        ├── kill.test.ts
        ├── chat.test.ts
        ├── reset.test.ts
        └── delete.test.ts