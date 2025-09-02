/**
 * DTO for Hyperliquid order data received from WebSocket or API
 */
export class HyperliquidOrderDto {
  coin: string; // Asset/coin symbol (e.g., "ETH", "HYPE", "@107", "@151")
  px: string; // Price
  sz: string; // Size
  side: string; // "B" for buy, "A" for sell
  time: number; // Timestamp
  startPosition: string; // Starting position
  dir: string; // Direction ("Buy", "Sell", "Open Long", "Close Long", "Open Short", "Close Short")
  closedPnl: string; // Closed profit and loss
  hash: string; // Transaction hash
  oid: number; // Order ID
  crossed: boolean; // Whether the order is crossed
  fee: string; // Fee amount
  tid: number; // Transaction ID
  feeToken: string; // Fee token (e.g., "USDC", "HYPE", "UETH")
}

/**
 * DTO for Hyperliquid API order request
 */
export class HyperliquidApiOrderDto {
  a: string; // Asset/coin
  b: boolean; // Is buy order
  p: string; // Price
  s: string; // Size
  r: boolean; // Reduce only
  t: {
    // Type
    limit: {
      tif: string; // Time in force: "Alo", "Ioc", or "Gtc"
    };
  };
}

/**
 * DTO for Hyperliquid API request body
 */
export class HyperliquidApiRequestDto {
  action: {
    type: string;
    orders: HyperliquidApiOrderDto[];
  };
  nonce: number;
  signature: {
    r: string;
    s: string;
    v: number;
  };
}

/**
 * DTO for Hyperliquid API response
 */
export class HyperliquidApiResponseDto {
  status: string;
  response: {
    type: string;
    data?: {
      statuses: Array<{
        resting?: {
          oid: number;
        };
        filled?: {
          totalSz: string;
          avgPx: string;
          oid: number;
        };
        error?: string;
      }>;
    };
  };
}
