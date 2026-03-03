import step1Image from '@images/boxToBot/step1.svg';
import step2Image from '@images/boxToBot/step2.svg';
import step3Image from '@images/boxToBot/step3.svg';
import step4Image from '@images/boxToBot/step4.svg';
const stepImages = [step1Image, step2Image, step3Image, step4Image];
interface StepProps {
    stepNumber: number;
    title: string;
    description: string;
}
const stepColours = ['bg-blue', 'bg-red', 'bg-green', 'bg-yellow']
export default function Step({ stepNumber, title, description }: StepProps) {
    return (
        <div className="step flex flex-col gap-6 ml-46.75">
            <div className="flex flex-row gap-6 items-start">
                <StepNumber stepNumber={stepNumber} />
                <div className=" flex flex-col gap-4">
                    <h3 className=" text-3xl font-semibold text-black">{title}</h3>
                    <p className=" text-black text-lg">{description}</p>
                </div>

            </div>
            {/* <img src={image.src} alt={`Step ${stepNumber} Illustration`} className="lg:hidden block w-full object-contain"/> */}
        </div>
    )
}
function StepNumber({ stepNumber }: { stepNumber: number }) {
    return (
        <h2 className={` text-4xl font-bold text-white rounded-[50%] w-16 h-16 min-w-16 min-h-16 flex items-center justify-center ${stepColours[stepNumber - 1]}`}>
            {stepNumber}
        </h2>
    )
}