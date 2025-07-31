declare module 'epubjs' {
  export interface Book {
    spine: Spine;
    navigation: Navigation;
    ready: Promise<void>;
    destroy(): void;
    load: {
      bind(book: Book): Function;
    };
  }

  export interface Spine {
    items: SpineItem[];
    get(index: number): Section | undefined;
  }

  export interface SpineItem {
    idref: string;
    href: string;
    index: number;
  }

  export interface Section {
    load(loadFn: Function): Promise<Document>;
  }

  export interface Navigation {
    toc: TocItem[];
  }

  export interface TocItem {
    id: string;
    href: string;
    label: string;
    subitems?: TocItem[];
  }

  export default function ePub(input: ArrayBuffer | string): Book;
}