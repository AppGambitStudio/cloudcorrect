import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Key, Copy, Trash2, Plus, Bot, Terminal, Blocks, ExternalLink, Check, Eye, EyeOff } from 'lucide-react';

interface ApiKeyResponse {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt?: string;
    createdAt: string;
    expiresAt?: string;
    revokedAt?: string;
}

export default function IntegrationsPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8801';
    const mcpEndpoint = `${apiUrl}/mcp`;

    useEffect(() => {
        if (!loading && !user) navigate('/login');
    }, [user, loading, navigate]);

    useEffect(() => {
        if (user) fetchKeys();
    }, [user]);

    const fetchKeys = async () => {
        try {
            const res = await api.get('/api-keys');
            setKeys(res.data);
        } catch { /* ignore */ }
    };

    const createKey = async () => {
        if (!newKeyName.trim()) return;
        try {
            const res = await api.post('/api-keys', {
                name: newKeyName,
                scopes: ['mcp:read', 'mcp:write', 'mcp:execute'],
            });
            setCreatedKey(res.data.rawKey);
            setNewKeyName('');
            fetchKeys();
        } catch {
            toast.error('Failed to create API key');
        }
    };

    const revokeKey = async (id: string) => {
        try {
            await api.delete(`/api-keys/${id}`);
            toast.success('API key revoked');
            fetchKeys();
        } catch {
            toast.error('Failed to revoke key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const claudeDesktopConfig = JSON.stringify({
        mcpServers: {
            cloudcorrect: {
                url: mcpEndpoint,
                headers: {
                    Authorization: "Bearer YOUR_API_KEY"
                }
            }
        }
    }, null, 2);

    const claudeCodeConfig = JSON.stringify({
        mcpServers: {
            cloudcorrect: {
                type: "url",
                url: mcpEndpoint,
                headers: {
                    Authorization: "Bearer YOUR_API_KEY"
                }
            }
        }
    }, null, 2);

    if (loading || !user) return null;

    return (
        <div className="p-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
                <p className="text-slate-500 mt-1">Connect AI agents and external tools to CloudCorrect via MCP</p>
            </div>

            <Tabs defaultValue="setup" className="space-y-6">
                <TabsList className="bg-slate-100 rounded-xl p-1">
                    <TabsTrigger value="setup" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Bot size={16} className="mr-2" /> Quick Setup
                    </TabsTrigger>
                    <TabsTrigger value="keys" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Key size={16} className="mr-2" /> API Keys
                    </TabsTrigger>
                    <TabsTrigger value="reference" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Blocks size={16} className="mr-2" /> MCP Reference
                    </TabsTrigger>
                </TabsList>

                {/* ─── Quick Setup ─── */}
                <TabsContent value="setup" className="space-y-6">
                    <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bot size={20} className="text-blue-600" />
                                What is MCP?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-3">
                            <p>
                                The <strong>Model Context Protocol (MCP)</strong> allows AI assistants like Claude to interact
                                with CloudCorrect directly — listing your AWS accounts, creating monitoring groups, running
                                evaluations, and investigating failures through natural conversation.
                            </p>
                            <p>
                                To get started, you need an <strong>API key</strong> and a supported MCP client.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        {/* Step 1 */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</div>
                                    <CardTitle className="text-base">Create an API Key</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 mb-4">
                                    Go to the <strong>API Keys</strong> tab and create a new key. Copy it immediately — it won't be shown again.
                                </p>
                                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                                    <Plus size={14} className="mr-1" /> Create API Key
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Step 2 — Claude Desktop */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">2</div>
                                    <CardTitle className="text-base">Connect to Claude Desktop</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Add this to your Claude Desktop config file at{' '}
                                    <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto">
                                        {claudeDesktopConfig}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                        onClick={() => copyToClipboard(claudeDesktopConfig)}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Replace <code className="px-1 py-0.5 bg-slate-100 rounded">YOUR_API_KEY</code> with the key from Step 1. Restart Claude Desktop after saving.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Step 2b — Claude Code */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-white text-sm font-bold">
                                        <Terminal size={14} />
                                    </div>
                                    <CardTitle className="text-base">Or connect via Claude Code (CLI)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Add this to <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">~/.claude/settings.json</code> or your project's <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">.mcp.json</code>
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto">
                                        {claudeCodeConfig}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                        onClick={() => copyToClipboard(claudeCodeConfig)}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 3 */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</div>
                                    <CardTitle className="text-base">Start Using</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 mb-4">Once connected, try asking Claude:</p>
                                <div className="space-y-2">
                                    {[
                                        "List my AWS accounts in CloudCorrect",
                                        "Create a security monitoring group for my production account",
                                        "Run an evaluation on my web-app group and show me the results",
                                        "Why is my database-monitoring group failing?",
                                        "Generate a compliance report for all my accounts",
                                    ].map((example, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                                            <span className="text-blue-500 mt-0.5">&#8250;</span>
                                            <span className="text-sm text-slate-700 italic">"{example}"</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── API Keys ─── */}
                <TabsContent value="keys" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>API Keys</CardTitle>
                                <CardDescription>Manage API keys for MCP and programmatic access</CardDescription>
                            </div>
                            <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600">
                                <Plus size={16} className="mr-1" /> New Key
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {keys.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Key size={40} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">No API keys yet</p>
                                    <p className="text-sm mt-1">Create your first key to connect AI agents</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Key</TableHead>
                                            <TableHead>Scopes</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Last Used</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {keys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-medium">{key.name}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                                        {key.keyPrefix}...
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {key.scopes.map((s) => (
                                                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {new Date(key.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                                </TableCell>
                                                <TableCell>
                                                    {key.revokedAt ? (
                                                        <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {!key.revokedAt && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => revokeKey(key.id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── MCP Reference ─── */}
                <TabsContent value="reference" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>MCP Server Details</CardTitle>
                            <CardDescription>Technical reference for the CloudCorrect MCP server</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-xs font-black uppercase text-slate-400">Endpoint</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 bg-slate-100 px-3 py-2 rounded-lg text-sm font-mono">{mcpEndpoint}</code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(mcpEndpoint)}>
                                        <Copy size={14} />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-black uppercase text-slate-400">Authentication</Label>
                                <p className="text-sm text-slate-600 mt-1">
                                    Include <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">Authorization: Bearer cc_xxxxx</code> header with your API key
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs font-black uppercase text-slate-400">Transport</Label>
                                <p className="text-sm text-slate-600 mt-1">Streamable HTTP (stateless, JSON responses)</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tools */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Available Tools (12)</CardTitle>
                            <CardDescription>Actions AI agents can perform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { name: 'list_aws_accounts', desc: 'List connected AWS accounts' },
                                    { name: 'list_groups', desc: 'List monitoring groups with status' },
                                    { name: 'get_group_detail', desc: 'Get group config and checks' },
                                    { name: 'create_group', desc: 'Create a new monitoring group' },
                                    { name: 'evaluate_group', desc: 'Run evaluation immediately' },
                                    { name: 'get_evaluation_history', desc: 'Get past evaluation runs' },
                                    { name: 'create_check', desc: 'Add a check to a group' },
                                    { name: 'update_check', desc: 'Modify check parameters' },
                                    { name: 'toggle_group', desc: 'Enable/disable a group' },
                                    { name: 'get_check_types', desc: 'List available check types' },
                                    { name: 'apply_template', desc: 'Apply a pre-built template' },
                                    { name: 'get_dashboard_summary', desc: 'Overall health summary' },
                                ].map((tool) => (
                                    <div key={tool.name} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                        <div>
                                            <code className="text-xs font-mono font-bold text-slate-800">{tool.name}</code>
                                            <p className="text-xs text-slate-500 mt-0.5">{tool.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resources */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Resources (6)</CardTitle>
                            <CardDescription>Data AI agents can read</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {[
                                    { uri: 'cloudcorrect://accounts', desc: 'Connected AWS accounts' },
                                    { uri: 'cloudcorrect://groups', desc: 'All monitoring groups with status' },
                                    { uri: 'cloudcorrect://groups/{id}', desc: 'Group detail with checks' },
                                    { uri: 'cloudcorrect://groups/{id}/history', desc: 'Evaluation history' },
                                    { uri: 'cloudcorrect://templates', desc: 'Available check templates' },
                                    { uri: 'cloudcorrect://check-types', desc: 'Service and check type reference' },
                                ].map((res) => (
                                    <div key={res.uri} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <code className="text-xs font-mono text-blue-600 shrink-0">{res.uri}</code>
                                        <span className="text-xs text-slate-500">{res.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prompts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Guided Prompts (3)</CardTitle>
                            <CardDescription>Pre-built interactions for common workflows</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { name: 'setup_monitoring', desc: 'Guided creation of monitoring checks for a specific AWS service', args: 'service, scenario?' },
                                    { name: 'investigate_failure', desc: 'Analyze why a group is failing with history and patterns', args: 'groupId' },
                                    { name: 'compliance_report', desc: 'Generate compliance summary across accounts', args: 'accountId?' },
                                ].map((prompt) => (
                                    <div key={prompt.name} className="p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <code className="text-sm font-mono font-bold text-slate-800">{prompt.name}</code>
                                            <Badge variant="secondary" className="text-[10px]">args: {prompt.args}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-500">{prompt.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ─── Create Key Dialog ─── */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreatedKey(null); }}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{createdKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
                    </DialogHeader>
                    {createdKey ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800 font-medium mb-2">
                                    Copy this key now — it won't be shown again.
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-mono border break-all">
                                        {createdKey}
                                    </code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </Button>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => { setIsCreateOpen(false); setCreatedKey(null); }} className="w-full">
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label>Key Name</Label>
                                <Input
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g., Claude Desktop, CI/CD Pipeline"
                                    className="mt-1"
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                The key will have full MCP access (read, write, execute) scoped to your tenant.
                            </p>
                            <DialogFooter>
                                <Button onClick={createKey} disabled={!newKeyName.trim()} className="w-full bg-blue-600">
                                    Create Key
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
