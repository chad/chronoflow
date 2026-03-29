import type { Agent } from '@atproto/api';
import type { Patch } from '../patch/types';

const COLLECTION = 'club.miren.mosh.patch';

interface PublishMeta {
  description: string;
  tags: string[];
}

export async function publishPatch(
  agent: Agent,
  patch: Patch,
  meta: PublishMeta
): Promise<{ uri: string; cid: string }> {
  const content = JSON.stringify(patch);
  if (content.length > 100000) {
    throw new Error('Patch too large to publish (>100KB)');
  }

  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: COLLECTION,
    record: {
      $type: COLLECTION,
      name: patch.meta.name,
      description: meta.description,
      content,
      tags: meta.tags,
      nodeCount: patch.nodes.length,
      createdAt: new Date().toISOString(),
    },
  });

  return { uri: res.data.uri, cid: res.data.cid };
}

export async function unpublishPatch(agent: Agent, rkey: string): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: COLLECTION,
    rkey,
  });
}

export async function getMyPublishedPatches(agent: Agent) {
  const res = await agent.com.atproto.repo.listRecords({
    repo: agent.assertDid,
    collection: COLLECTION,
    limit: 100,
  });
  return res.data.records;
}
