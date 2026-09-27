import axios from 'axios';
import * as cheerio from 'cheerio';

export async function extractTextFromURL(targetUrl: string): Promise<string> {
  const cleanUrl = targetUrl.replace(/\/+$/, '');
  const response = await axios.get(cleanUrl, {
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(response.data);
  $('script, style, noscript, svg').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
