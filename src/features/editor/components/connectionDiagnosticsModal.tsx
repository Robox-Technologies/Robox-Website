import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
    faCircleExclamation,
    faCircleInfo,
    faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Dialog, {
    DialogBody,
    DialogFooter,
    DialogHeader,
} from '@/components/dialog'
import {
    preflight,
    type PreflightIssue,
    type PreflightReport,
} from '@/libs/communication/connectionDiagnostics'

function diagnosticsText(report: PreflightReport): string {
    return JSON.stringify(report.diagnostics, null, 2)
}

async function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    if (!copied) throw new Error('Clipboard access is unavailable')
}

function IssueCard({ issue }: { issue: PreflightIssue }) {
    const severityStyle = {
        error: {
            icon: faCircleExclamation,
            className: 'text-red',
        },
        warning: {
            icon: faTriangleExclamation,
            className: 'text-yellow-600',
        },
        info: {
            icon: faCircleInfo,
            className: 'text-blue',
        },
    }[issue.severity]

    return (
        <section className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <FontAwesomeIcon
                icon={severityStyle.icon}
                className={`mt-1 shrink-0 ${severityStyle.className}`}
                aria-hidden="true"
            />
            <div>
                <h3 className="font-semibold">{issue.title}</h3>
                <p className="mt-1 text-sm">
                    <strong>Cause:</strong> {issue.cause}
                </p>
                <p className="mt-1 text-sm">
                    <strong>Fix:</strong> {issue.fix}
                </p>
            </div>
        </section>
    )
}

function AutoOpenTrigger({
    report,
    setIsOpen,
}: {
    report: PreflightReport | null
    setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
    useEffect(() => {
        if (report?.issues.length) setIsOpen(true)
    }, [report, setIsOpen])

    return null
}

export default function ConnectionDiagnosticsModal() {
    const [report, setReport] = useState<PreflightReport | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        void preflight()
            .then(setReport)
            .catch((error: unknown) => {
                console.error('Connection preflight failed', error)
            })
    }, [])

    return (
        <Dialog
            className="max-h-[calc(100%-2rem)] max-w-2xl"
            trigger={(setIsOpen) => (
                <AutoOpenTrigger report={report} setIsOpen={setIsOpen} />
            )}
        >
            {report && (
                <>
                    <DialogHeader className="items-start">
                        <h2>Connection checks found issues</h2>
                        <p className="mt-1 text-sm font-normal">
                            These checks ran when the editor loaded. Fix the
                            relevant item before connecting.
                        </p>
                    </DialogHeader>
                    <DialogBody className="px-6 py-4">
                        <div className="divide-y divide-gray-200">
                            {report.issues.map((issue, index) => (
                                <IssueCard
                                    key={`${issue.transport}-${issue.title}-${index}`}
                                    issue={issue}
                                />
                            ))}
                        </div>
                        <details className="mt-4 border-t border-gray-200 pt-4">
                            <summary className="cursor-pointer font-semibold text-blue underline">
                                Show diagnostics
                            </summary>
                            <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-3 text-xs">
                                {diagnosticsText(report)}
                            </pre>
                        </details>
                    </DialogBody>
                    <DialogFooter className="justify-end">
                        <button
                            type="button"
                            className="button-interactive rounded border-2 border-blue bg-white px-3 py-2 text-blue"
                            onClick={() => {
                                void copyText(diagnosticsText(report))
                                    .then(() => setCopied(true))
                                    .catch((error: unknown) => {
                                        console.error(
                                            'Could not copy connection diagnostics',
                                            error,
                                        )
                                        setCopied(false)
                                    })
                            }}
                        >
                            {copied ? 'Copied' : 'Copy diagnostics'}
                        </button>
                    </DialogFooter>
                </>
            )}
        </Dialog>
    )
}
