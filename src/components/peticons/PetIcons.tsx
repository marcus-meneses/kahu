import classes from '@components/peticons/component.module.css';
import { TranslationKey } from '../../i18n/dictionaries';
import { useI18n } from '../../i18n/I18nContext';

function PetIconImage({ src, altKey }: { src: string; altKey: TranslationKey }) {
    const { t } = useI18n();
    return <img src={src} alt={t(altKey)} className={classes.imgIcon}/>;
}

export function PetIconVetConsultation(){
    return (
        <PetIconImage src="/icons/001-animal-care.png" altKey="icon.consultations" />
    );
}

export function PetIconVaccine(){
    return(
        <PetIconImage src="/icons/002-animal-vaccination.png" altKey="icon.vaccines" />
    )
}

export function PetIconExams(){
    return(
        <PetIconImage src="/icons/003-x-ray.png" altKey="icon.exams" />
    )
}

export function PetIconProcedures(){
    return(
        <PetIconImage src="/icons/004-broken-leg.png" altKey="icon.procedures" />
    )
}

export function PetIconGrooming(){
    return (
        <PetIconImage src="/icons/005-pet-grooming.png" altKey="nav.grooming" />
    );
}

export function PetIconShop(){
    return (
        <PetIconImage src="/icons/006-pet-shop.png" altKey="nav.shop" />
    );
}

export function PetIconVet(){
    return (
        <PetIconImage src="/icons/007-vet.png" altKey="nav.vet" />
    );
}

export function PetIconHotel(){
    return (
        <PetIconImage src="/icons/008-pet-hotel.png" altKey="nav.hotel" />
    );
}

export function PetIconBath(){
    return (
        <PetIconImage src="/icons/009-pet.png" altKey="icon.bath" />
    );
}

export function PetIconDressing(){
    return (
        <PetIconImage src="/icons/010-hairdresser.png" altKey="icon.dressing" />
    );
}

export function PetIconGroomingOthers(){
    return (
        <PetIconImage src="/icons/011-nail-polish.png" altKey="icon.groomingOthers" />
    );
}

export function PetIconHouses(){
    return (
        <PetIconImage src="/icons/012-dog-house.png" altKey="icon.houses" />
    );
}

export function PetIconBeds(){
    return (
        <PetIconImage src="/icons/013-pet-bed.png" altKey="icon.beds" />
    );
}

export function PetIconToys(){
    return (
        <PetIconImage src="/icons/014-pet-1.png" altKey="icon.toys" />
    );
}

export function PetIconFood(){
    return (
        <PetIconImage src="/icons/015-pet-food.png" altKey="icon.food" />
    );
} 

export function PetIconBoxes(){
    return (
        <PetIconImage src="/icons/016-pet-box.png" altKey="icon.boxes" />
    );
}

export function PetIconSnacks(){
    return (
        <PetIconImage src="/icons/017-snack.png" altKey="icon.snacks" />
    );
}

export function PetIconPills(){
    return (
        <PetIconImage src="/icons/018-pills.png" altKey="icon.pills" />
    );
}

export function PetIconDog(){
    return (
        <PetIconImage src="/icons/019-dog.png" altKey="icon.dog" />
    );
}

export function PetIconCat(){
    return (
        <PetIconImage src="/icons/020-happy.png" altKey="icon.cat" />
    );
}

export function PetIconSnake(){
    return (
        <PetIconImage src="/icons/021-snake.png" altKey="icon.snake" />
    );
}

export function PetIconTurtle(){
    return (
        <PetIconImage src="/icons/022-turtle.png" altKey="icon.turtle" />
    );
}

export function PetIconChameleon(){
    return (
        <PetIconImage src="/icons/023-chameleon.png" altKey="icon.chameleon" />
    );
}

export function PetIconPig(){
    return (
        <PetIconImage src="/icons/024-pig.png" altKey="icon.pig" />
    );
}

export function PetIconGuinea(){
    return (
        <PetIconImage src="/icons/025-guinea-pig.png" altKey="icon.guinea" />
    );
}

export function PetIconChinchilla(){
    return (
        <PetIconImage src="/icons/026-chinchilla.png" altKey="icon.chinchilla" />
    );
}

export function PetIconRabbit(){
    return (
        <PetIconImage src="/icons/027-rabbit.png" altKey="icon.rabbit" />
    );
}

export function PetIconGoat(){
    return (
        <PetIconImage src="/icons/028-goat.png" altKey="icon.goat" />
    );
}

export function PetIconCow(){
    return (
        <PetIconImage src="/icons/029-cow.png" altKey="icon.cow" />
    );
}

export function PetIconHorse(){
    return (
        <PetIconImage src="/icons/030-horse.png" altKey="icon.horse" />
    );
}

export function PetIconParrot(){
    return (
        <PetIconImage src="/icons/031-parrot.png" altKey="icon.parrot" />
    );
}

export function PetIconBird(){
    return (
        <PetIconImage src="/icons/032-robin.png" altKey="icon.birds" />
    );
}

export function PetIconFish(){
    return (
        <PetIconImage src="/icons/033-fish-bowl.png" altKey="icon.fish" />
    );
}

export function PetIconMedicalReport(){
    return (
        <PetIconImage src="/icons/034-medical-checkup.png" altKey="icon.medicalReport" />
    );
}

export function PetIconAttest(){
    return (
        <PetIconImage src="/icons/035-clipboard.png" altKey="icon.attests" />
    );
}

export function PetIconPet(){
    return (
        <PetIconImage src="/icons/036-pets.png" altKey="nav.animals" />
    );
}

export function PetIconPetOwner(){
    return (
        <PetIconImage src="/icons/037-pet-care.png" altKey="nav.tutors" />
    );
}

export function  PetIconClothes(){
    return (
        <PetIconImage src="/icons/038-tshirt.png" altKey="icon.clothes" />
    );
}

export function PetIconCollars(){
    return (
        <PetIconImage src="/icons/039-leash.png" altKey="icon.collars" />
    );
}

export function PetIconHygiene(){
    return (
        <PetIconImage src="/icons/040-pet-shampoo.png" altKey="icon.hygiene" />
    );
}

export function PetIconHacker(){
    return (
        <PetIconImage src="/icons/041-hacker.png" altKey="icon.hacker" />
    );
}

export function PetIconSettings(){
    return (
        <PetIconImage src="/icons/042-settings.png" altKey="nav.settings" />
    );
}

export function PetIconSchedule(){
    return (
        <PetIconImage src="/icons/043-veterinary.png" altKey="icon.schedule" />
    );
}
export function PetIconImpersonation(){
    return (
        <PetIconImage src="/icons/044-impersonation.png" altKey="icon.impersonation" />
    );
}

export function PetIconInventory(){
    return <PetIconImage src="/icons/045-inventory.png" altKey="nav.inventory" />;
}
