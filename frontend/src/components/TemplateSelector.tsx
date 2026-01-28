"use client";

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Server,
    Activity,
    Globe,
    Shield,
    Database,
    Zap,
    Layers,
    ChevronRight,
    ChevronLeft,
    Check,
    FileText,
    Settings,
    Lock,
    Cloud,
    Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    CHECK_TEMPLATES,
    getAllTemplates,
    getTemplate,
    getTemplateCategories,
    type CheckTemplate,
    type TemplateCheck,
} from '@/lib/checkTemplates';
import {
    SERVICES,
    OPERATORS,
    getService,
    getCheckType,
    type ServiceId,
} from '@/lib/checksReference';

// =============================================================================
// TYPES
// =============================================================================

export interface TemplateSelectorData {
    templateId: string;
    templateName: string;
    checks: TemplateCheck[];
}

interface TemplateSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (data: TemplateSelectorData) => void;
}

type ViewMode = 'templates' | 'configure';

// =============================================================================
// ICON MAPPING
// =============================================================================

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Security: Shield,
    Monitoring: Activity,
    Database: Database,
    Networking: Globe,
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Server,
    Activity,
    Globe,
    Shield,
    Database,
    Zap,
    Layers,
    Cloud,
    Network,
};

function getCategoryIcon(category: string) {
    return CATEGORY_ICONS[category] || FileText;
}

function getServiceIcon(iconName: string) {
    return SERVICE_ICONS[iconName] || Server;
}

// =============================================================================
// VIEW 1: TEMPLATE SELECTION GRID
// =============================================================================

interface TemplateGridProps {
    selectedTemplate: CheckTemplate | null;
    onSelectTemplate: (template: CheckTemplate) => void;
    filterCategory: string | null;
    onFilterChange: (category: string | null) => void;
}

function TemplateGrid({
    selectedTemplate,
    onSelectTemplate,
    filterCategory,
    onFilterChange,
}: TemplateGridProps) {
    const categories = getTemplateCategories();
    const templates = useMemo(() => {
        const allTemplates = getAllTemplates();
        if (!filterCategory) return allTemplates;
        return allTemplates.filter(t => t.category === filterCategory);
    }, [filterCategory]);

    return (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Choose a Template</h3>
                <p className="text-sm text-slate-500 mt-1">
                    Start with a pre-configured set of checks for common scenarios
                </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant={filterCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange(null)}
                    className="h-8"
                >
                    All
                </Button>
                {categories.map((category) => {
                    const Icon = getCategoryIcon(category);
                    return (
                        <Button
                            key={category}
                            variant={filterCategory === category ? "default" : "outline"}
                            size="sm"
                            onClick={() => onFilterChange(category)}
                            className="h-8"
                        >
                            <Icon size={14} className="mr-1.5" />
                            {category}
                        </Button>
                    );
                })}
            </div>

            {/* Template Grid */}
            <ScrollArea className="h-[380px] pr-4">
                <div className="grid grid-cols-1 gap-3">
                    {templates.map((template) => {
                        const Icon = getCategoryIcon(template.category);
                        const isSelected = selectedTemplate?.id === template.id;

                        return (
                            <button
                                key={template.id}
                                onClick={() => onSelectTemplate(template)}
                                className={cn(
                                    "flex items-start p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                                    isSelected
                                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                                        : "border-slate-200 hover:border-slate-300 bg-white"
                                )}
                            >
                                <div
                                    className={cn(
                                        "p-2.5 rounded-lg mr-3 shrink-0",
                                        isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                                    )}
                                >
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className={cn(
                                            "font-semibold text-sm",
                                            isSelected ? "text-blue-900" : "text-slate-900"
                                        )}>
                                            {template.name}
                                        </h4>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] h-5 bg-slate-100 ml-2"
                                        >
                                            {template.checks.length} checks
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {template.description}
                                    </p>
                                    {/* Preview of included checks */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {template.checks.slice(0, 3).map((check, idx) => {
                                            const service = getService(check.service);
                                            const ServiceIcon = service ? getServiceIcon(service.icon) : Server;
                                            return (
                                                <Badge
                                                    key={idx}
                                                    variant="outline"
                                                    className="text-[10px] h-5 bg-white"
                                                >
                                                    <ServiceIcon size={10} className="mr-1" />
                                                    {check.service}
                                                </Badge>
                                            );
                                        })}
                                        {template.checks.length > 3 && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] h-5 bg-white"
                                            >
                                                +{template.checks.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {isSelected && (
                                    <Check size={18} className="text-blue-600 shrink-0 ml-2" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}

// =============================================================================
// VIEW 2: CHECK CONFIGURATION FORM
// =============================================================================

interface ConfigurationFormProps {
    template: CheckTemplate;
    checkConfigs: TemplateCheck[];
    onUpdateCheck: (index: number, field: string, value: string | number | boolean) => void;
}

function ConfigurationForm({
    template,
    checkConfigs,
    onUpdateCheck,
}: ConfigurationFormProps) {
    // Collect all unique parameters across checks with their labels
    const uniqueParams = useMemo(() => {
        const params = new Map<string, { label: string; checks: number[] }>();

        checkConfigs.forEach((check, checkIndex) => {
            Object.keys(check.parameters).forEach((paramName) => {
                const label = template.parameterLabels[paramName] || paramName;
                if (!params.has(paramName)) {
                    params.set(paramName, { label, checks: [] });
                }
                params.get(paramName)!.checks.push(checkIndex);
            });
        });

        return params;
    }, [checkConfigs, template.parameterLabels]);

    // Group checks by service for display
    const checksByService = useMemo(() => {
        const grouped = new Map<ServiceId, { service: typeof SERVICES[ServiceId]; checks: { check: TemplateCheck; index: number }[] }>();

        checkConfigs.forEach((check, index) => {
            const service = getService(check.service);
            if (!service) return;

            if (!grouped.has(check.service)) {
                grouped.set(check.service, { service, checks: [] });
            }
            grouped.get(check.service)!.checks.push({ check, index });
        });

        return grouped;
    }, [checkConfigs]);

    return (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                    <Settings size={20} className="text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-slate-900">Configure Checks</h3>
                </div>
                <p className="text-sm text-slate-500">
                    Fill in the parameters for each check in the template
                </p>
            </div>

            <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                    {Array.from(checksByService.entries()).map(([serviceId, { service, checks }]) => {
                        const Icon = getServiceIcon(service.icon);

                        return (
                            <div key={serviceId} className="space-y-3">
                                {/* Service Header */}
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div className={cn("p-1.5 rounded-md bg-slate-100", service.iconColor)}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="font-medium text-sm text-slate-700">
                                        {service.name}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] ml-auto">
                                        {checks.length} check{checks.length > 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                {/* Checks for this service */}
                                {checks.map(({ check, index }) => {
                                    const checkType = getCheckType(check.service, check.type);

                                    return (
                                        <div
                                            key={index}
                                            className="p-4 bg-slate-50/50 rounded-lg border border-slate-100"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-sm text-slate-800">
                                                    {check.name}
                                                </h4>
                                                {check.operator && (
                                                    <Badge className="bg-purple-100 text-purple-700 text-[10px] border-purple-200">
                                                        {OPERATORS.find(op => op.value === check.operator)?.label || check.operator}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Parameter Inputs */}
                                            <div className="space-y-3">
                                                {Object.entries(check.parameters).map(([paramName, paramValue]) => {
                                                    const paramDef = checkType?.parameters.find(p => p.name === paramName);
                                                    const label = template.parameterLabels[paramName] || paramDef?.label || paramName;

                                                    // Skip if this is an internal/fixed parameter
                                                    if (typeof paramValue === 'number' && paramDef?.type !== 'number') {
                                                        return null;
                                                    }

                                                    return (
                                                        <div key={paramName} className="space-y-1">
                                                            <Label
                                                                htmlFor={`${index}-${paramName}`}
                                                                className="text-xs font-medium text-slate-600"
                                                            >
                                                                {label}
                                                                {paramDef?.required && (
                                                                    <span className="text-red-500 ml-0.5">*</span>
                                                                )}
                                                            </Label>
                                                            {paramDef?.type === 'select' && paramDef.options ? (
                                                                <Select
                                                                    value={String(paramValue)}
                                                                    onValueChange={(val) => onUpdateCheck(index, paramName, val)}
                                                                >
                                                                    <SelectTrigger className="h-9 border-slate-200 text-sm w-full">
                                                                        <SelectValue placeholder={paramDef.placeholder} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {paramDef.options.map((opt) => (
                                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                                {opt.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Input
                                                                    id={`${index}-${paramName}`}
                                                                    type={paramDef?.type === 'number' ? 'number' : 'text'}
                                                                    className="h-9 border-slate-200 text-sm"
                                                                    placeholder={paramDef?.placeholder || ''}
                                                                    value={String(paramValue)}
                                                                    onChange={(e) => {
                                                                        const value = paramDef?.type === 'number'
                                                                            ? (e.target.value === '' ? '' : parseInt(e.target.value, 10))
                                                                            : e.target.value;
                                                                        onUpdateCheck(index, paramName, value as string | number);
                                                                    }}
                                                                    min={paramDef?.validation?.min}
                                                                    max={paramDef?.validation?.max}
                                                                />
                                                            )}
                                                            {paramDef?.help && (
                                                                <p className="text-[10px] text-slate-400">{paramDef.help}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TemplateSelector({ open, onOpenChange, onComplete }: TemplateSelectorProps) {
    const [view, setView] = useState<ViewMode>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<CheckTemplate | null>(null);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [checkConfigs, setCheckConfigs] = useState<TemplateCheck[]>([]);

    // Reset state when dialog closes
    React.useEffect(() => {
        if (!open) {
            setView('templates');
            setSelectedTemplate(null);
            setFilterCategory(null);
            setCheckConfigs([]);
        }
    }, [open]);

    // Initialize check configs when template is selected
    React.useEffect(() => {
        if (selectedTemplate) {
            // Deep copy the checks to avoid mutating the original template
            setCheckConfigs(
                selectedTemplate.checks.map(check => ({
                    ...check,
                    parameters: { ...check.parameters }
                }))
            );
        }
    }, [selectedTemplate]);

    const handleSelectTemplate = (template: CheckTemplate) => {
        setSelectedTemplate(template);
    };

    const handleUpdateCheck = (index: number, field: string, value: string | number | boolean) => {
        setCheckConfigs(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                parameters: {
                    ...updated[index].parameters,
                    [field]: value
                }
            };
            return updated;
        });
    };

    const handleNext = () => {
        if (view === 'templates' && selectedTemplate) {
            setView('configure');
        } else if (view === 'configure' && selectedTemplate) {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (view === 'configure') {
            setView('templates');
        }
    };

    const handleComplete = () => {
        if (!selectedTemplate) return;

        const data: TemplateSelectorData = {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            checks: checkConfigs,
        };

        onComplete(data);
        onOpenChange(false);
    };

    const canProceed = () => {
        if (view === 'templates') {
            return selectedTemplate !== null;
        }
        if (view === 'configure') {
            // Validate that all required parameters are filled
            if (!selectedTemplate) return false;

            for (const check of checkConfigs) {
                const checkType = getCheckType(check.service, check.type);
                if (!checkType) continue;

                for (const param of checkType.parameters) {
                    if (param.required) {
                        const value = check.parameters[param.name];
                        if (value === undefined || value === '' || value === null) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center">
                        <FileText size={22} className="mr-2 text-blue-600" />
                        {view === 'templates' ? 'Select Template' : `Configure: ${selectedTemplate?.name}`}
                    </DialogTitle>
                    <DialogDescription>
                        {view === 'templates'
                            ? 'Choose a pre-built template to quickly set up monitoring for common scenarios.'
                            : 'Fill in the required parameters to customize the checks for your infrastructure.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* View Indicator */}
                <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="flex items-center">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                view === 'templates'
                                    ? "bg-blue-600 text-white"
                                    : "bg-green-500 text-white"
                            )}
                        >
                            {view === 'configure' ? <Check size={16} /> : '1'}
                        </div>
                        <span className={cn(
                            "ml-2 text-sm font-medium hidden sm:block",
                            view === 'templates' ? "text-slate-900" : "text-slate-500"
                        )}>
                            Select Template
                        </span>
                    </div>
                    <div className={cn(
                        "w-12 h-0.5 transition-colors",
                        view === 'configure' ? "bg-green-500" : "bg-slate-200"
                    )} />
                    <div className="flex items-center">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                view === 'configure'
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-200 text-slate-500"
                            )}
                        >
                            2
                        </div>
                        <span className={cn(
                            "ml-2 text-sm font-medium hidden sm:block",
                            view === 'configure' ? "text-slate-900" : "text-slate-500"
                        )}>
                            Configure Checks
                        </span>
                    </div>
                </div>

                <div className="min-h-[480px]">
                    {view === 'templates' && (
                        <TemplateGrid
                            selectedTemplate={selectedTemplate}
                            onSelectTemplate={handleSelectTemplate}
                            filterCategory={filterCategory}
                            onFilterChange={setFilterCategory}
                        />
                    )}
                    {view === 'configure' && selectedTemplate && (
                        <ConfigurationForm
                            template={selectedTemplate}
                            checkConfigs={checkConfigs}
                            onUpdateCheck={handleUpdateCheck}
                        />
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={view === 'templates' ? () => onOpenChange(false) : handleBack}
                        className="h-11 px-6"
                    >
                        {view === 'templates' ? (
                            'Cancel'
                        ) : (
                            <>
                                <ChevronLeft size={16} className="mr-2" />
                                Back
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
                    >
                        {view === 'configure' ? (
                            <>
                                <Check size={16} className="mr-2" />
                                Apply Template
                            </>
                        ) : (
                            <>
                                Configure
                                <ChevronRight size={16} className="ml-2" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default TemplateSelector;
