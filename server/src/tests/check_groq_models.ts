import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

async function checkModels() {
  const key = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY prefix:', key ? key.slice(0, 10) : 'none');

  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${key}` }
  });

  if (res.ok) {
    const data = await res.json();
    console.log('Available Groq models:', data.data.map((m: any) => m.id));
  } else {
    console.error('Error fetching models:', res.status, await res.text());
  }
}

checkModels();
