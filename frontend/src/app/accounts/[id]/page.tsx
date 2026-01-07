"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
    Shield,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Activity,
    AlertTriangle,
    ExternalLink,
    Search,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface AnalyticsData {
    account: {
        id: string;
        name: string;
        awsAccountId: string;
        region: string;
    };
    stats: {
        totalGroups: number;
        activeGroups: number;
        passGroups: number;
        failGroups: number;
        pendingGroups: number;
        totalChecks: number;
    };
    recentRuns: any[];
    groups: any[];
}

export default function AccountDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/aws-accounts/${id}/analytics`);
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch account analytics', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [id, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen font-bold text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-2" />
                Loading account dashboard...
            </div>
        );
    }

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }
    if (!data) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Account Not Found</h2>
                <p className="text-slate-500 mt-2">We couldn't find the account you're looking for.</p>
                <Link href="/accounts">
                    <Button className="mt-6">Back to Accounts</Button>
                </Link>
            </div>
        );
    }

    const passRate = data.stats.activeGroups > 0
        ? Math.round((data.stats.passGroups / data.stats.activeGroups) * 100)
        : 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/accounts" className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Accounts
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">{data.account.name}</h1>
                        <Badge variant="outline" className="font-mono text-slate-500">
                            {data.account.awsAccountId}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchAnalytics} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">Architectural Health</p>
                            <Activity className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{passRate}%</span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pass Rate</span>
                        </div>
                        <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${passRate > 80 ? 'bg-green-500' : passRate > 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${passRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">Invariant Groups</p>
                            <Shield className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{data.stats.totalGroups}</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-green-600">{data.stats.passGroups} PASS</span>
                                <span className="text-[10px] font-bold text-red-600">{data.stats.failGroups} FAIL</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">Active Invariants</p>
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{data.stats.totalChecks}</span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Checks</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">Connected Region</p>
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl font-bold">{data.account.region}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono break-all">
                            Connected via {data.account.awsAccountId}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>Latest architectural evaluations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.recentRuns.length > 0 ? (
                                data.recentRuns.map((run) => (
                                    <div key={run.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${run.status === 'PASS' ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold leading-none">{run.InvariantGroup.name}</p>
                                            <div className="flex justify-between items-center w-full">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${run.status === 'PASS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {run.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {format(new Date(run.evaluatedAt), 'HH:mm')} • {format(new Date(run.evaluatedAt), 'MMM dd')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Groups Overview */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg flex items-center">
                                <Search className="w-4 h-4 mr-2" />
                                Invariant Groups
                            </CardTitle>
                            <CardDescription>All governance groups mapped to this account</CardDescription>
                        </div>
                        <Link href="/groups">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                View All
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Checks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.groups.length > 0 ? (
                                    data.groups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">
                                                {group.name}
                                                <p className="text-[10px] text-slate-400 font-normal">{group.description || 'No description'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    group.lastStatus === 'PASS' ? 'bg-green-500' :
                                                        group.lastStatus === 'FAIL' ? 'bg-red-500' :
                                                            'bg-slate-400'
                                                }>
                                                    {group.lastStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {group.checks?.length || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/groups/${group.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                            No Invariant Groups found for this account.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
