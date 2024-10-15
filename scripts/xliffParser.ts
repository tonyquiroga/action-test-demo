import * as fs from 'fs/promises';
import * as rxjs from 'rxjs';
import * as path from 'path';
import { promisify } from 'util';
import { SpanOrStandaloneOrString, xliff2js, Translation } from 'xliff/cjs';
//import { availableLocales } from 'src/assets/locale/available-locales';

/*
 * A script converting XLF files to JSON files
 */
const availableLocales = [
  'en-US', //english
  'es-MX', //spanish mexico
  'de-CH', //german
  'pl-PL', //polish
  'pt-PT', //portuguese
  'howdy'
];

let needsUpdate = {} as any;
let doesntNeedUpdate = {} as any;
let needsTranslation: boolean = false;

const xliffToJs = promisify(xliff2js);
const pathToEnlishJson = (`${__dirname}/../src/assets/locale/en-US.json`);
const pathToFolder = (`${__dirname}/../src/assets/locale`);

function translateFiles(fileNames: string[]) {
  return Promise.all(fileNames.filter((fileName) => fileName.includes('.xlf')).map(translateFile));
}

function translateFile(xlifFile: string) {
  const fileName = xlifFile.split('.')[0];
  return fs
    .readFile(path.join(pathToFolder, `${fileName}.xlf`))
    .then((value) => value.toString())
    .then((value) => parseTranslationsForLocalize(value))
    .then((val) => writeFile(val, fileName));
}

async function parseTranslationsForLocalize(translations: string): Promise<Record<string, string>> {
  const parserResult = await xliffToJs(translations);

  const { ngi18n } = parserResult.resources;
  if (!ngi18n) {
    throw new Error('Expected ng18n resource to be available in xliff file');
  }

  return Object.entries(ngi18n).reduce<Record<string, string>>((result: Record<string, string>, [key, translation]: [string, Translation]) => {
    if (Array.isArray(translation.target)) {
      result[key] = reduceTranslation(translation.target);
    } else if (Array.isArray(translation.source)) {
      result[key] = reduceTranslation(translation.source);
    } else {
      result[key] = translation.target ?? translation.source;
    }
    return result;
  }, {});
}

function reduceTranslation(translation: SpanOrStandaloneOrString[]): string {
  return translation.reduce<string>((finalTranslation, translation) => {
    if (typeof translation === 'string') {
      return finalTranslation + translation;
    } else if ('Standalone' in translation) {
      return finalTranslation + '{$' + translation.Standalone.equiv + '}';
    }
    // Any nested HTML elements will be thrown in here, they are not needed as of now
    return finalTranslation;
  }, '');
}

async function writeFile(val: Record<string, string>, fileName: string){
  /* THEN ->  en-US.json exists in which case we rename it to (old) and create a new file
    CATCH ->  en-US.json does not exist and we create a new file either way
  */
  await fs.rename(pathToEnlishJson, `${pathToEnlishJson}/../en-US(old).json`)
    .then(_ => fs.writeFile(path.join(pathToFolder, `${fileName}.json`), JSON.stringify(val, null, '\t')))
    .catch(_ => fs.writeFile(path.join(pathToFolder, `${fileName}.json`), JSON.stringify(val, null, '\t')));
}

async function createOrMerge(){
  const findUpdatedValues = (fileNames: string[]) => {
    return Promise.all(fileNames.map(file => fs.readFile(file, 'utf-8')));
  }

  /* THEN -> en-US(old).json exists in which case we can compare old keys to new keys and figure out if any need updating
    CATCH -> en-US(old).json does not exist in which case we have no file to compare keys with and the safest bet is to translate all keys
   */
  await findUpdatedValues([pathToEnlishJson, `${pathToEnlishJson}/../en-US(old).json`])
  .then(([newTranslations, oldTranslations]) =>  {
    let newObject = JSON.parse(newTranslations);
    let oldObject = JSON.parse(oldTranslations);

    Object.keys(newObject).forEach(key => {
      if(!(key in oldObject) || (key in oldObject && newObject[key] !== oldObject[key])){
        needsUpdate[key] = newObject[key];
        needsTranslation = true;
      } else {
        doesntNeedUpdate[key] = newObject[key];
      }
    });
  }).catch(() => fs.readFile(pathToEnlishJson, 'utf-8').then(newTranslations => {
    let newObject = JSON.parse(newTranslations);

    Object.keys(newObject).forEach(key => {
      needsUpdate[key] = newObject[key];
    });

    needsTranslation = true;
  }));
}

async function cycleThrough() {
  // if(!needsTranslation){
  //   return;
  // }
  /* Attempts to read the file in the directory. 
    IF it exists -> language translations file already exists and we need only copy the values that don't need updating/translating
    ELSE -> create new translations file and values will need to be translated to new language
  */
  for(const locale of availableLocales.filter(locale => locale !== 'en-US')){
    try {
      const fileHandle = await fs.open(`${pathToFolder}/${locale}.json`);
      const content = await fileHandle.readFile('utf-8');
      let newFile = {} as any;
      let fileContents = JSON.parse(content);
  
      //Grabbing translations from old file that dont need to be updated
      Object.keys(doesntNeedUpdate).forEach(key => {
        newFile[key] = fileContents[key];
      });
  
      await fs.writeFile(path.join(pathToFolder, `${locale}.json`), JSON.stringify(newFile, null, '\t'));
      await fileHandle.close();

    } catch {
      await fs.copyFile(pathToEnlishJson, `${pathToEnlishJson}/../${locale}.json`);
    }
  }
}

fs.readdir(pathToFolder).then((fileNames) => translateFiles(fileNames).then(() => createOrMerge()).then(() => cycleThrough()));
