interface StepProps {
    stepNumber: number
    title: string
    description: string
    image: string
}
const stepColours = ['bg-blue', 'bg-red', 'bg-green', 'bg-yellow']
const firstStep = 1;
const numSteps = 4;
export default function Step({ stepNumber, title, description, image }: StepProps) {

    return (
        <div
            className={`step
            mt-[64px] mb-0 
            
            ${stepNumber === firstStep ? 'lg:mt-[max(45vh,250px)]' : 'lg:mt-[30vh]'}
            ${stepNumber === numSteps ? 'lg:mb-[55px]' : ''}
            `}
        >
            <div className="flex flex-row gap-6 items-center">
                <StepNumber stepNumber={stepNumber} />
                <div className=" flex flex-col gap-4">
                    <h3 className=" text-3xl font-semibold text-white">
                        {title}
                    </h3>
                    <p className=" text-white text-lg">{description}</p>
                </div>
            </div>
            {/* Decorative — the title and description above already say what this step is. */}
            <img
                src={image}
                alt=""
                aria-hidden="true"
                className="lg:hidden w-[70%] m-[32px_auto_auto]"
            />
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
