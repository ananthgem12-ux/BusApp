#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      rejectUnauthorized: false // Bypasses SSL certificate issues common on government servers
    };

    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to load page: status code ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function getAllRoutes() {
  const url = 'https://mtcbus.tn.gov.in/Home/routewiseinfo';
  try {
    const html = await fetchHtml(url);
    const selectMatch = html.match(/<select name="selroute"[^>]*>([\s\S]*?)<\/select>/);
    if (!selectMatch) return [];

    const optionRegex = /<option value="([^"]+)"/g;
    const routes = [];
    let match;
    while ((match = optionRegex.exec(selectMatch[1])) !== null) {
      const val = match[1];
      if (val !== '' && val !== '1') {
        routes.push(val);
      }
    }
    return routes;
  } catch (err) {
    console.error(`Error fetching routes list: ${err.message}`);
    return [];
  }
}

async function getRouteStages(routeNo) {
  const encodedRoute = encodeURIComponent(routeNo);
  const url = `https://mtcbus.tn.gov.in/Home/routewiseinfo?selroute=${encodedRoute}&submit=`;
  try {
    const html = await fetchHtml(url);
    
    // Parse stages list
    const routeMatch = html.match(/<ul class="route">([\s\S]*?)<\/ul>/);
    const stages = [];
    if (routeMatch) {
      const itemRegex = /<li><span>(\d+)<\/span>\s*([\s\S]*?)\s*<\/li>/g;
      let match;
      while ((match = itemRegex.exec(routeMatch[1])) !== null) {
        stages.push({
          sequence: parseInt(match[1], 10),
          stage_name: match[2].replace(/\s+/g, ' ').trim()
        });
      }
    }

    // Parse metadata
    let origin = '';
    let destination = '';
    
    const originMatch = html.match(/<span class="color-brown">Origin<\/span>\s*<h5>([\s\S]*?)<\/h5>/);
    if (originMatch) {
      origin = originMatch[1].replace(/\s+/g, ' ').trim();
    }

    const destMatch = html.match(/<span class="color-dblue">Destination<\/span>\s*<h5>([\s\S]*?)<\/h5>/);
    if (destMatch) {
      destination = destMatch[1].replace(/\s+/g, ' ').trim();
    }

    if (stages.length === 0 && !origin && !destination) {
      return null;
    }

    return {
      route_no: routeNo,
      origin: origin,
      destination: destination,
      stages_count: stages.length,
      stages: stages
    };
  } catch (err) {
    console.error(`Error fetching details for route ${routeNo}: ${err.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const routeIdx = args.indexOf('--route');
  const listIdx = args.indexOf('--list-routes');
  const allIdx = args.indexOf('--all');
  const outputIdx = args.indexOf('--output');
  const delayIdx = args.indexOf('--delay');

  let outputFile = 'mtc_routes.json';
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputFile = args[outputIdx + 1];
  }

  let delay = 1000;
  if (delayIdx !== -1 && args[delayIdx + 1]) {
    delay = parseInt(args[delayIdx + 1], 10);
  }

  if (listIdx !== -1) {
    const routes = await getAllRoutes();
    console.log(JSON.stringify(routes, null, 2));
  } else if (routeIdx !== -1 && args[routeIdx + 1]) {
    const route = args[routeIdx + 1];
    const data = await getRouteStages(route);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error(`Failed to find route data for ${route}.`);
      process.exit(1);
    }
  } else if (allIdx !== -1) {
    console.log('Fetching route list first...');
    const routes = await getAllRoutes();
    console.log(`Found ${routes.length} routes. Starting scraper...`);
    
    const results = {};
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      console.log(`[${i + 1}/${routes.length}] Scraping route ${r}...`);
      const data = await getRouteStages(r);
      if (data) {
        results[r] = data;
      } else {
        console.warn(`  Warning: No details found for route ${r}`);
      }
      await sleep(delay);
    }

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Scraping complete! Saved data to ${outputFile}`);
  } else {
    console.log(`
MTC Bus Route Scraper CLI

Usage:
  node mtc_scraper.js --route <route_no>      Fetch data for a single route (e.g. 555S)
  node mtc_scraper.js --list-routes           List all available route numbers from the website
  node mtc_scraper.js --all                   Scrape all routes and save to a JSON file
  
Options:
  --output <filename>                         Filename to save data (default: mtc_routes.json)
  --delay <ms>                                Delay between requests in milliseconds (default: 1000)
    `);
  }
}

main();
