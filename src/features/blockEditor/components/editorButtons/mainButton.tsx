import Button from "@components/button";
import { usePico } from "@hooks/usePico";
export default function MainButton() {
    return (
        <Button className="bg-blue rounded-3xl box-shadow w-70 text-xl font-bold">
            Connect To RoBox
        </Button>
    )
}
