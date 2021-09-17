#!/usr/bin/env node

import * as yargs from 'yargs';
import * as fs from 'fs-extra';
import * as path from 'path';

const argv = yargs
  .option({
    input: {
      alias: 'i',
      describe: 'File or folder to be parsed',
      type: 'string',
      demandOption: true,
      requiresArg: true,
    },
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v').argv as {
  input: string;
  _: (string | number)[];
  $0: string;
};
const { input } = argv;

const output = 'dist';
fs.removeSync(output);
fs.ensureDirSync(output);
fs.ensureFileSync(`${output}/index.css`);

fs.copyFileSync('src/styles/index.css', `${output}/index.css`);

/**
 * Description
 * @param fileName What's fileName?
 * @return what it returns?
 */
const processFile = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== '.txt') {
    return '';
  }

  const text = fs.readFileSync(filePath, 'utf-8');

  // title is before the first 2 blank lines of the text
  const titleAndContent = text.split(/\n\n\n/);
  let title = '';
  let content = '';

  if (titleAndContent.length >= 2) {
    [title] = titleAndContent;
    content = titleAndContent.slice(1).join('\n\n\n');
  } else {
    [content] = titleAndContent;
  }

  const head = `<meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="index.css"> 
                <title>${title || path.basename(filePath, '.txt')}</title>`;

  const body = `
                ${title ? `<h1>${title}</h1>` : ''}
                ${content
                  .split(/\r?\n\r?\n/)
                  .map((para) => `<p>${para.replace(/\r?\n/, ' ')}</p>`)
                  .join('\n')}
                  `;

  const markup = `<!DOCTYPE html>
      <html lang="en">
        <head>
          ${head}
        </head>
        <body>
          ${body}
        </body>
      </html>`;

  return markup.split(/\n\s+/).join('\n');
};

let inputPath;
try {
  inputPath = fs.statSync(input);
} catch {
  console.error(`${input}: No such file or directory`);
  fs.readdirSync(output);
  process.exit(1);
}

if (inputPath.isFile()) {
  const markup = processFile(input);
  if (!markup) {
    console.error('Input file must be .txt');
  }

  fs.writeFileSync(`${output}/${path.basename(input, '.txt')}.html`, markup, { flag: 'w' });
} else if (inputPath.isDirectory()) {
  const files = fs.readdirSync(input, { withFileTypes: true }).filter((file) => file.isFile());

  const dists: string[] = [];

  files.forEach((file) => {
    const markup = processFile(`${input}/${file.name}`);
    if (markup) {
      const filePath = `${output}/${path.basename(file.name, '.txt')}.html`;
      fs.writeFileSync(filePath, markup, { flag: 'w' });
      dists.push(filePath);
    }
  });

  const indexMarkup = `<!DOCTYPE html>
      <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="index.css"> 
        <title>${path.basename(input)}</title>
        </head>
        <body>
          <h1>${path.basename(input)}</h1>
          <ul>
            ${dists
              .map(
                (dist) =>
                  `<li><a href="${path.relative(output, dist)}">${path.basename(
                    dist,
                    '.html'
                  )}</a></li>`
              )
              .join('\n')}
          </ul>
        </body>
      </html>`
    .split(/\n\s+/)
    .join('\n');

  fs.writeFileSync(`${output}/index.html`, indexMarkup, { flag: 'w' });
} else {
  console.error(`${input}: No such file or directory`);
  process.exit(1);
}
