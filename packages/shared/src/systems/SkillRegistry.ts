import skillsData from '../data/skills.json';

export class SkillRegistry {
    private static skills: Map<string, any> = new Map();
    private static initialized: boolean = false;

    public static load() {
        if (this.initialized) return;
        if (skillsData) {
            Object.entries(skillsData).forEach(([key, val]) => {
                this.skills.set(key, val);
            });
        }
        this.initialized = true;
    }

    public static get(id: string) {
        if (!this.initialized) this.load();
        return this.skills.get(id);
    }
}