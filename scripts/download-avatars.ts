import fs from 'fs';

const categories = {
  'femmes': { coll: 'lorelei', seeds: ['Sarah', 'Lily', 'Chloe', 'Mia', 'Zoe', 'Emma', 'Ava', 'Nora', 'Ruby', 'Bella'] },
  'hommes': { coll: 'adventurer', seeds: ['Jack', 'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry'] },
  'robots': { coll: 'bottts', seeds: ['R2', 'BB', 'C3', 'T800', 'WallE', 'Eve', 'Bender', 'Glados', 'Hal', 'Data'] }
};

if (!fs.existsSync('public/avatars')) fs.mkdirSync('public/avatars', { recursive: true });

async function download() {
  for (const [cat, data] of Object.entries(categories)) {
    for (let i = 0; i < data.seeds.length; i++) {
        const seed = data.seeds[i];
        const res = await fetch(`https://api.dicebear.com/8.x/${data.coll}/svg?seed=${seed}&backgroundColor=transparent`);
        const text = await res.text();
        fs.writeFileSync(`public/avatars/${cat}-${i}.svg`, text);
        console.log(`Downloaded ${cat}-${i}`);
    }
  }
}

download();
