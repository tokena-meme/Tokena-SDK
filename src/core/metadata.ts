import type { TokenMetadata, MetadataAdapter } from '../types';

/**
 * Default IPFS gateway URL.
 */
export const DEFAULT_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

/**
 * Build a full IPFS URL from a CID.
 *
 * @param cid - IPFS content identifier
 * @param gateway - IPFS gateway base URL (default: Pinata)
 * @returns Full URL
 */
export function ipfsUrl(cid: string, gateway: string = DEFAULT_IPFS_GATEWAY): string {
  // Handle ipfs:// protocol
  const cleanCid = cid.replace(/^ipfs:\/\//, '');
  return `${gateway}${cleanCid}`;
}

/**
 * Load JSON metadata from IPFS.
 *
 * @param cid - IPFS content identifier
 * @param gateway - IPFS gateway base URL
 * @returns Parsed JSON metadata
 */
export async function loadFromIpfs(
  cid: string,
  gateway: string = DEFAULT_IPFS_GATEWAY
): Promise<Record<string, unknown>> {
  const url = ipfsUrl(cid, gateway);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load IPFS content: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse raw IPFS metadata into a TokenMetadata object.
 * Handles common metadata formats.
 */
export function parseTokenMetadata(raw: Record<string, unknown>, ipfsHash?: string): TokenMetadata {
  return {
    logo: (raw.logo ?? raw.image ?? raw.icon ?? raw.logoUrl) as string | undefined,
    description: (raw.description ?? raw.desc ?? raw.about) as string | undefined,
    website: (raw.website ?? raw.url ?? raw.homepage) as string | undefined,
    twitter: (raw.twitter ?? raw.x ?? raw.twitterUrl) as string | undefined,
    telegram: (raw.telegram ?? raw.telegramUrl ?? raw.tg) as string | undefined,
    discord: (raw.discord ?? raw.discordUrl) as string | undefined,
    ipfsHash,
    rawMetadata: raw,
  };
}

/**
 * Create a simple metadata adapter that loads metadata from IPFS.
 * The host app provides a function to resolve a token address to an IPFS CID.
 *
 * @param getCid - Function that resolves a token address to an IPFS CID (or null)
 * @param gateway - IPFS gateway URL
 * @returns MetadataAdapter implementation
 */
export function createIpfsMetadataAdapter(
  getCid: (tokenAddress: string) => Promise<string | null>,
  gateway: string = DEFAULT_IPFS_GATEWAY
): MetadataAdapter {
  return {
    async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
      const cid = await getCid(tokenAddress);
      if (!cid) return null;

      try {
        const raw = await loadFromIpfs(cid, gateway);
        return parseTokenMetadata(raw, cid);
      } catch {
        return null;
      }
    },
  };
}
