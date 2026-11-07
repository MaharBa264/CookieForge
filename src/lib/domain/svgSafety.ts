import { DesignDocumentValidationError } from './validationError';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
const FORBIDDEN_DECLARATION_PATTERN = /<!\s*(?:DOCTYPE|ENTITY)\b/i;
const XML_STYLESHEET_PATTERN = /<\?\s*xml-stylesheet\b/i;
const LOCAL_FRAGMENT_PATTERN = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/;
const LOCAL_URL_REFERENCE_PATTERN =
  /^\s*url\s*\(\s*#[A-Za-z_][A-Za-z0-9_.:-]*\s*\)\s*$/i;
const CSS_URL_PATTERN = /url\s*\(/i;

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'title',
  'desc'
]);

function invalid(path: string, message: string): never {
  throw new DesignDocumentValidationError(path, message);
}

function containsJavascriptProtocol(value: string): boolean {
  return value
    .replace(/[\u0000-\u0020\u007f]+/g, '')
    .toLowerCase()
    .includes('javascript:');
}

function isParserError(document: Document): boolean {
  const elements = [
    document.documentElement,
    ...Array.from(document.getElementsByTagName('*'))
  ];

  return elements.some(
    (element) => element !== null && element.localName.toLowerCase() === 'parsererror'
  );
}

function hasAllowedElementNamespace(element: Element): boolean {
  return (
    element.namespaceURI === null ||
    element.namespaceURI === '' ||
    element.namespaceURI === SVG_NAMESPACE
  );
}

function isXmlBaseAttribute(attribute: Attr): boolean {
  const localName = attribute.localName.toLowerCase();
  const qualifiedName = attribute.name.toLowerCase();
  const prefix = attribute.prefix?.toLowerCase();
  const namespace = attribute.namespaceURI?.toLowerCase();

  return (
    qualifiedName === 'xml:base' ||
    (localName === 'base' &&
      (prefix === 'xml' || namespace === XML_NAMESPACE.toLowerCase()))
  );
}

function validateAttribute(attribute: Attr, path: string): void {
  const name = attribute.localName.toLowerCase();
  const qualifiedName = attribute.name.toLowerCase();
  const value = attribute.value;

  if (name.startsWith('on') || qualifiedName.startsWith('on')) {
    invalid(path, `contiene el atributo de evento prohibido ${attribute.name}.`);
  }

  if (name === 'style') {
    invalid(path, `contiene el atributo prohibido ${attribute.name}.`);
  }

  if (isXmlBaseAttribute(attribute)) {
    invalid(path, `contiene el atributo prohibido ${attribute.name}.`);
  }

  if (name === 'src') {
    invalid(path, `contiene el atributo prohibido ${attribute.name}.`);
  }

  if (value.includes('/*') || value.includes('*/') || value.includes('\\')) {
    invalid(
      path,
      `contiene una secuencia CSS prohibida en ${attribute.name}.`
    );
  }

  if (containsJavascriptProtocol(value)) {
    invalid(path, `contiene un valor javascript: prohibido en ${attribute.name}.`);
  }

  if (name === 'href' && !LOCAL_FRAGMENT_PATTERN.test(value)) {
    invalid(path, `${attribute.name} debe ser un fragmento local con la forma #id.`);
  }

  if (
    CSS_URL_PATTERN.test(value) &&
    !LOCAL_URL_REFERENCE_PATTERN.test(value)
  ) {
    invalid(path, `${attribute.name} solo debe referenciar url(#id).`);
  }
}

export function validateSafeSvg(value: string, path: string): string {
  if (FORBIDDEN_DECLARATION_PATTERN.test(value)) {
    invalid(path, 'contiene una declaración DOCTYPE o ENTITY prohibida.');
  }

  if (XML_STYLESHEET_PATTERN.test(value)) {
    invalid(path, "contiene una instrucción xml-stylesheet prohibida.");
  }

  let document: Document;
  try {
    document = new DOMParser().parseFromString(value, 'image/svg+xml');
  } catch {
    invalid(path, "no es un documento XML SVG bien formado.");
  }

  if (isParserError(document)) {
    invalid(path, "no es un documento XML SVG bien formado.");
  }

  const root = document.documentElement;
  if (
    root === null ||
    root.localName.toLowerCase() !== 'svg' ||
    !hasAllowedElementNamespace(root)
  ) {
    invalid(path, 'debe tener un elemento <svg> como raíz.');
  }

  const elements = [root, ...Array.from(root.getElementsByTagName('*'))];
  for (const element of elements) {
    const elementName = element.localName.toLowerCase();
    if (!ALLOWED_ELEMENTS.has(elementName)) {
      invalid(path, `contiene el elemento no permitido <${element.localName}>.`);
    }

    if (!hasAllowedElementNamespace(element)) {
      invalid(
        path,
        `contiene el elemento <${element.localName}> en un espacio de nombres no permitido.`
      );
    }

    for (const attribute of Array.from(element.attributes)) {
      validateAttribute(attribute, path);
    }
  }

  return value;
}