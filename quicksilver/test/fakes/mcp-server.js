// A tiny real MCP server (official SDK, stdio) for tests: one read-only tool and one write tool.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const server = new McpServer({ name: 'test-server', version: '1.0.0' });
server.registerTool('echo', { description: 'Echo text back', inputSchema: { text: z.string() }, annotations: { readOnlyHint: true } }, async ({ text }) => ({ content: [{ type: 'text', text: `echo: ${text}` }] }));
server.registerTool('save_note', { description: 'Save a note', inputSchema: { text: z.string() } }, async ({ text }) => ({ content: [{ type: 'text', text: `saved: ${text}` }] }));
server.connect(new StdioServerTransport());
