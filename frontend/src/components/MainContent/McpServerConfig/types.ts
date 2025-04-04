// Shared types for MCP Server Configuration components

// Matches the structure from the Python backend: MarketplaceMCPServerItem
export interface MarketplaceMCPServerItem {
  name: string;
  description?: string;
  mcp_type?: string; // Optional as it has a default in Python
  command?: string;  // Optional as it has a default in Python
  args?: string[];   // Optional as it has a default in Python
  env?: Record<string, string>; // Optional as it has a default in Python
  url?: string;      // Optional as it has a default in Python
}

// Interface for Environment Variables in the Edit Form
export interface EnvVar {
  id: number;
  key: string;
  value: string;
}

// Interface for the state, adding the display type
export interface McpServerInfo extends MarketplaceMCPServerItem {
  displayType: 'Built-in' | 'External' | 'Marketplace'; // Renamed 'type' to avoid conflict and clarify purpose
}

// Interface for the API response structure (matching McpResponse with ListResult)
export interface McpListApiResponse {
  result: string; // Assuming 'result' holds a status message like 'success'
  error?: string;
  raw_result?: { // raw_result itself is optional in McpResponse
    builtin_servers?: MarketplaceMCPServerItem[]; // lists are optional in ListResult
    external_servers?: MarketplaceMCPServerItem[];
    marketplace_items?: MarketplaceMCPServerItem[]; // Added marketplace_items
    error?: string;
  };
}
