import { HierarchicalNSW } from 'hnswlib-node';
import { glob } from 'glob';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const HNSW_INDEX_DIR = join(process.cwd(), 'hnsw_index');
const HNSW_INDEX_PATH = join(HNSW_INDEX_DIR, 'hnsw_index.bin');

if (!existsSync(HNSW_INDEX_DIR)) {
  mkdirSync(HNSW_INDEX_DIR, { recursive: true });
}

const MAX_ELEMENTS = 10000;
const HNSW_DIMENSIONS = 1536;

export class LocalVectorStore {
  private index: HierarchicalNSW;
  private documents: Map<number, any> = new Map();
  private nextId = 0;

  constructor() {
    this.index = new HierarchicalNSW('l2', HNSW_DIMENSIONS);
    this.load();
  }

  private load() {
    if (existsSync(HNSW_INDEX_PATH)) {
      this.index.readIndexSync(HNSW_INDEX_PATH);
      const docFiles = glob.sync(`${HNSW_INDEX_DIR}/*.json`);
      for (const file of docFiles) {
        const doc = JSON.parse(readFileSync(file, 'utf-8'));
        this.documents.set(doc.id, doc);
        if (doc.id >= this.nextId) {
          this.nextId = doc.id + 1;
        }
      }
    } else {
      this.index.initIndex(MAX_ELEMENTS);
    }
  }

  private save() {
    this.index.writeIndexSync(HNSW_INDEX_PATH);
    for (const [id, doc] of this.documents) {
      writeFileSync(`${HNSW_INDEX_DIR}/${id}.json`, JSON.stringify(doc));
    }
  }

  add(embedding: number[], document: any) {
    const id = this.nextId++;
    this.index.addPoint(embedding, id);
    this.documents.set(id, document);
    this.save();
  }

  search(embedding: number[], k: number) {
    const result = this.index.searchKnn(embedding, k);
    return result.neighbors.map((id, i) => ({
      document: this.documents.get(id),
      distance: result.distances[i],
    }));
  }
}
