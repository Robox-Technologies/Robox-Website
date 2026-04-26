interface StepProps {
    stepNumber: number
    title: string
    description: string
}
const stepColours = ['bg-blue', 'bg-red', 'bg-green', 'bg-yellow']
export default function Step({ stepNumber, title, description }: StepProps) {

    return (
        <div
            className="step flex flex-col gap-6 ml-46.75"
            style={{ marginTop: 'max(25vh, 150px)' }}
        >
            <div className="flex flex-row gap-6 items-start">
                <StepNumber stepNumber={stepNumber} />
                <div className=" flex flex-col gap-4">
                    <h3 className=" text-3xl font-semibold text-black">
                        {title}
                    </h3>
                    <p className=" text-black text-lg">{description}</p>
                </div>
            </div>
        </div>
    )
}
function StepNumber({ stepNumber }: { stepNumber: number }) {
    return (
        <h2
            className={` text-4xl font-bold text-white rounded-[50%] w-16 h-16 min-w-16 min-h-16 flex items-center justify-center ${stepColours[stepNumber - 1]}`}
        >
            {stepNumber}
        </h2>
    )
}
