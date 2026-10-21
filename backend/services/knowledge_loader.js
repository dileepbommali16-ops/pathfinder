const fs = require('fs');
const path = require('path');

class KnowledgeLoader {
    constructor() {
        this.cache = {};
        this.loadKnowledge();
    }

    loadKnowledge() {
        const dirs = [
            path.join(__dirname, '../knowledge'),
            path.join(__dirname, 'knowledge')
        ];

        dirs.forEach((knowledgeDir) => {
            try {
                if (!fs.existsSync(knowledgeDir)) {
                    return;
                }

                const files = fs.readdirSync(knowledgeDir);
                files.forEach((file) => {
                    if (file.endsWith('.md') || file.endsWith('.json')) {
                        const filePath = path.join(knowledgeDir, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        this.cache[file] = content;
                        console.log(`[KnowledgeLoader] Cached: ${file}`);
                    }
                });
            } catch (error) {
                console.error('[KnowledgeLoader] Error loading files:', error);
            }
        });
    }

    getKnowledge(fileName) {
        if (Object.keys(this.cache).length === 0) {
            this.loadKnowledge();
        }
        if (this.cache[fileName]) {
            return this.cache[fileName];
        }
        if (this.cache[`${fileName}.md`]) {
            return this.cache[`${fileName}.md`];
        }
        if (this.cache[`${fileName}.json`]) {
            return this.cache[`${fileName}.json`];
        }
        return null;
    }

    getAllKnowledge() {
        if (Object.keys(this.cache).length === 0) {
            this.loadKnowledge();
        }
        return Object.values(this.cache).join('\n\n--- FILE BREAK ---\n\n');
    }
}

module.exports = new KnowledgeLoader();

