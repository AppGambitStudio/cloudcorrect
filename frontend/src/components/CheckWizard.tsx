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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    Info,
    HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    SERVICES,
    OPERATORS,
    type ServiceId,
    type ServiceDefinition,
    type CheckTypeDefinition,
    type ParameterDefinition,
    getService,
    getCheckType,
} from '@/lib/checksReference';

// =============================================================================
// TYPES
// =============================================================================

export interface CheckWizardData {
    service: ServiceId;
    type: string;
    scope: 'REGIONAL' | 'GLOBAL';
    region: string;
    alias: string;
    operator: string;
    parameters: Record<string, any>;
}

interface CheckWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (data: CheckWizardData) => void;
    initialData?: Partial<CheckWizardData>;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Server,
    Activity,
    Globe,
    Shield,
    Database,
    Zap,
    Layers,
    Cloud: Globe, // Fallback
};

function getServiceIcon(iconName: string) {
    return ICON_MAP[iconName] || Server;
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    stepLabels: string[];
}

function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center space-x-2 mb-6">
            {stepLabels.map((label, index) => (
                <React.Fragment key={index}>
                    <div className="flex items-center">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                index < currentStep
                                    ? "bg-green-500 text-white"
                                    : index === currentStep
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-200 text-slate-500"
                            )}
                        >
                            {index < currentStep ? (
                                <Check size={16} />
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span
                            className={cn(
                                "ml-2 text-sm font-medium hidden sm:block",
                                index === currentStep ? "text-slate-900" : "text-slate-500"
                            )}
                        >
                            {label}
                        </span>
                    </div>
                    {index < totalSteps - 1 && (
                        <div
                            className={cn(
                                "w-12 h-0.5 transition-colors",
                                index < currentStep ? "bg-green-500" : "bg-slate-200"
                            )}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// =============================================================================
// STEP 1: SERVICE SELECTION
// =============================================================================

interface Step1Props {
    selectedService: ServiceId | null;
    onSelectService: (service: ServiceId) => void;
}

function Step1ServiceSelection({ selectedService, onSelectService }: Step1Props) {
    const services = Object.values(SERVICES);

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Choose an AWS Service</h3>
                <p className="text-sm text-slate-500 mt-1">
                    Select the AWS service you want to monitor
                </p>
            </div>
            <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map((service) => {
                        const Icon = getServiceIcon(service.icon);
                        const isSelected = selectedService === service.id;

                        return (
                            <button
                                key={service.id}
                                onClick={() => onSelectService(service.id)}
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
                                    <Icon size={20} className={service.iconColor} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className={cn(
                                        "font-semibold text-sm",
                                        isSelected ? "text-blue-900" : "text-slate-900"
                                    )}>
                                        {service.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                        {service.description.split('.')[0]}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {service.categories.map((cat) => (
                                            <Badge
                                                key={cat}
                                                variant="secondary"
                                                className="text-[10px] h-4 bg-slate-100"
                                            >
                                                {cat}
                                            </Badge>
                                        ))}
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
// STEP 2: CHECK TYPE SELECTION
// =============================================================================

interface Step2Props {
    service: ServiceDefinition;
    selectedCheckType: string | null;
    onSelectCheckType: (checkType: string) => void;
}

function Step2CheckTypeSelection({ service, selectedCheckType, onSelectCheckType }: Step2Props) {
    const Icon = getServiceIcon(service.icon);

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                    <div className={cn("p-2 rounded-lg bg-slate-100 text-slate-600 mr-2", service.iconColor)}>
                        <Icon size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                </div>
                <p className="text-sm text-slate-500">
                    Choose what you want to verify
                </p>
            </div>
            <ScrollArea className="h-[400px] pr-4">
                <RadioGroup
                    value={selectedCheckType || ''}
                    onValueChange={onSelectCheckType}
                    className="space-y-3"
                >
                    {service.checkTypes.map((checkType) => (
                        <label
                            key={checkType.id}
                            htmlFor={checkType.id}
                            className={cn(
                                "flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                                selectedCheckType === checkType.id
                                    ? "border-blue-500 bg-blue-50/50"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                            )}
                        >
                            <RadioGroupItem
                                value={checkType.id}
                                id={checkType.id}
                                className="mt-0.5 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm text-slate-900">
                                        {checkType.name}
                                    </h4>
                                    {checkType.supportsOperator && (
                                        <Badge className="bg-purple-100 text-purple-700 text-[10px] border-purple-200">
                                            Supports Operators
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                    {checkType.description}
                                </p>
                                <div className="flex items-start mt-2 p-2 bg-slate-50 rounded-lg">
                                    <HelpCircle size={12} className="text-slate-400 mr-1.5 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        {checkType.whenToUse}
                                    </p>
                                </div>
                            </div>
                        </label>
                    ))}
                </RadioGroup>
            </ScrollArea>
        </div>
    );
}

// =============================================================================
// STEP 3: PARAMETERS
// =============================================================================

interface Step3Props {
    service: ServiceDefinition;
    checkType: CheckTypeDefinition;
    parameters: Record<string, any>;
    onUpdateParameter: (name: string, value: any) => void;
    operator: string;
    onUpdateOperator: (operator: string) => void;
    region: string;
    onUpdateRegion: (region: string) => void;
    alias: string;
    onUpdateAlias: (alias: string) => void;
    scope: 'REGIONAL' | 'GLOBAL';
}

function Step3Parameters({
    service,
    checkType,
    parameters,
    onUpdateParameter,
    operator,
    onUpdateOperator,
    region,
    onUpdateRegion,
    alias,
    onUpdateAlias,
    scope,
}: Step3Props) {
    const Icon = getServiceIcon(service.icon);

    return (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                    <div className={cn("p-2 rounded-lg bg-slate-100 text-slate-600 mr-2", service.iconColor)}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{checkType.name}</h3>
                    </div>
                </div>
                <p className="text-sm text-slate-500">
                    Configure the check parameters
                </p>
            </div>

            <ScrollArea className="h-[380px] pr-4">
                <div className="space-y-4">
                    {/* Required Parameters */}
                    {checkType.parameters.map((param) => (
                        <div key={param.name} className="space-y-2">
                            <Label htmlFor={param.name} className="text-sm font-medium text-slate-700 flex items-center">
                                {param.label}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {param.type === 'select' && param.options ? (
                                <Select
                                    value={parameters[param.name] || ''}
                                    onValueChange={(val) => onUpdateParameter(param.name, val)}
                                >
                                    <SelectTrigger className="h-11 border-slate-200 w-full">
                                        <SelectValue placeholder={param.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {param.options.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id={param.name}
                                    type={param.type === 'number' ? 'number' : 'text'}
                                    className="h-11 border-slate-200"
                                    placeholder={param.placeholder}
                                    value={parameters[param.name] || ''}
                                    onChange={(e) => {
                                        const value = param.type === 'number'
                                            ? (e.target.value === '' ? '' : parseInt(e.target.value, 10))
                                            : e.target.value;
                                        onUpdateParameter(param.name, value);
                                    }}
                                    min={param.validation?.min}
                                    max={param.validation?.max}
                                />
                            )}
                            <p className="text-[11px] text-slate-400">{param.help}</p>
                        </div>
                    ))}

                    {/* Operator Selection (if supported) */}
                    {checkType.supportsOperator && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label className="text-sm font-medium text-slate-700">Comparison Operator</Label>
                            <Select value={operator} onValueChange={onUpdateOperator}>
                                <SelectTrigger className="h-11 border-slate-200 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {OPERATORS.map((op) => (
                                        <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-400">
                                How to compare the observed value against the expected value
                            </p>
                        </div>
                    )}

                    {/* Region Selection (if regional) */}
                    {scope === 'REGIONAL' && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label className="text-sm font-medium text-slate-700">AWS Region</Label>
                            <Input
                                className="h-11 border-slate-200"
                                value={region}
                                onChange={(e) => onUpdateRegion(e.target.value)}
                                placeholder="us-east-1"
                            />
                            <p className="text-[11px] text-slate-400">
                                The AWS region where the resource is located
                            </p>
                        </div>
                    )}

                    {/* Alias (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Label className="text-sm font-medium text-slate-700">Alias (Optional)</Label>
                        <Input
                            className="h-11 border-slate-200"
                            value={alias}
                            onChange={(e) => onUpdateAlias(e.target.value)}
                            placeholder="e.g., web-server"
                        />
                        <p className="text-[11px] text-slate-400">
                            A short name to reference this check's results in other checks
                        </p>
                        {alias && service.aliasProperties.length > 0 && (
                            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 mt-2">
                                <div className="flex items-center text-[10px] font-black uppercase text-blue-400 mb-2">
                                    <Info size={12} className="mr-1" />
                                    Available Properties
                                </div>
                                <p className="text-[11px] text-slate-600">
                                    {service.aliasProperties.map((prop, i) => (
                                        <span key={prop}>
                                            <code className="text-blue-700 bg-blue-100/50 px-1 rounded">
                                                {`{{${alias}.${prop}}}`}
                                            </code>
                                            {i < service.aliasProperties.length - 1 && ', '}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export function CheckWizard({ open, onOpenChange, onComplete, initialData }: CheckWizardProps) {
    const [step, setStep] = useState(0);
    const [selectedService, setSelectedService] = useState<ServiceId | null>(initialData?.service || null);
    const [selectedCheckType, setSelectedCheckType] = useState<string | null>(initialData?.type || null);
    const [parameters, setParameters] = useState<Record<string, any>>(initialData?.parameters || {});
    const [operator, setOperator] = useState(initialData?.operator || 'EQUALS');
    const [region, setRegion] = useState(initialData?.region || 'us-east-1');
    const [alias, setAlias] = useState(initialData?.alias || '');

    // Get service and check type definitions
    const service = selectedService ? getService(selectedService) : null;
    const checkType = selectedService && selectedCheckType
        ? getCheckType(selectedService, selectedCheckType)
        : null;

    // Determine scope based on service
    const scope = useMemo(() => {
        if (!selectedService) return 'REGIONAL';
        // Global services
        if (['Route53', 'IAM', 'CloudFront'].includes(selectedService)) {
            return 'GLOBAL';
        }
        if (selectedService === 'NETWORK') {
            return 'GLOBAL';
        }
        return 'REGIONAL';
    }, [selectedService]) as 'REGIONAL' | 'GLOBAL';

    // Reset when dialog closes
    React.useEffect(() => {
        if (!open) {
            setStep(0);
            setSelectedService(initialData?.service || null);
            setSelectedCheckType(initialData?.type || null);
            setParameters(initialData?.parameters || {});
            setOperator(initialData?.operator || 'EQUALS');
            setRegion(initialData?.region || 'us-east-1');
            setAlias(initialData?.alias || '');
        }
    }, [open, initialData]);

    // Reset check type when service changes
    React.useEffect(() => {
        if (selectedService && !initialData?.type) {
            setSelectedCheckType(null);
            setParameters({});
        }
    }, [selectedService, initialData?.type]);

    // Set default operator when check type changes
    React.useEffect(() => {
        if (checkType?.defaultOperator && !initialData?.operator) {
            setOperator(checkType.defaultOperator);
        }
    }, [checkType, initialData?.operator]);

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleComplete = () => {
        if (!selectedService || !selectedCheckType) return;

        const data: CheckWizardData = {
            service: selectedService,
            type: selectedCheckType,
            scope,
            region,
            alias,
            operator,
            parameters,
        };

        onComplete(data);
        onOpenChange(false);
    };

    const canProceed = () => {
        switch (step) {
            case 0:
                return selectedService !== null;
            case 1:
                return selectedCheckType !== null;
            case 2:
                if (!checkType) return false;
                // Check required parameters
                for (const param of checkType.parameters) {
                    if (param.required && !parameters[param.name]) {
                        return false;
                    }
                }
                return true;
            default:
                return false;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Create New Check
                    </DialogTitle>
                    <DialogDescription>
                        Set up a new architectural assertion to monitor your AWS infrastructure.
                    </DialogDescription>
                </DialogHeader>

                <StepIndicator
                    currentStep={step}
                    totalSteps={3}
                    stepLabels={['Service', 'Check Type', 'Parameters']}
                />

                <div className="min-h-[450px]">
                    {step === 0 && (
                        <Step1ServiceSelection
                            selectedService={selectedService}
                            onSelectService={setSelectedService}
                        />
                    )}
                    {step === 1 && service && (
                        <Step2CheckTypeSelection
                            service={service}
                            selectedCheckType={selectedCheckType}
                            onSelectCheckType={setSelectedCheckType}
                        />
                    )}
                    {step === 2 && service && checkType && (
                        <Step3Parameters
                            service={service}
                            checkType={checkType}
                            parameters={parameters}
                            onUpdateParameter={(name, value) =>
                                setParameters({ ...parameters, [name]: value })
                            }
                            operator={operator}
                            onUpdateOperator={setOperator}
                            region={region}
                            onUpdateRegion={setRegion}
                            alias={alias}
                            onUpdateAlias={setAlias}
                            scope={scope}
                        />
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 0}
                        className="h-11 px-6"
                    >
                        <ChevronLeft size={16} className="mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
                    >
                        {step === 2 ? (
                            <>
                                <Check size={16} className="mr-2" />
                                Create Check
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight size={16} className="ml-2" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default CheckWizard;
