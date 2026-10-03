import { ReactElement } from "react";
import { SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import sidebarClasses from "@components/leftsidebar/component.module.css";
import {
  PetIconAttest,
  PetIconBath,
  PetIconBeds,
  PetIconBird,
  PetIconBoxes,
  PetIconCat,
  PetIconChameleon,
  PetIconChinchilla,
  PetIconClothes,
  PetIconCollars,
  PetIconCow,
  PetIconDog,
  PetIconDressing,
  PetIconExams,
  PetIconFish,
  PetIconFood,
  PetIconGoat,
  PetIconGrooming,
  PetIconGroomingOthers,
  PetIconGuinea,
  PetIconHacker,
  PetIconHotel,
  PetIconHorse,
  PetIconHouses,
  PetIconHygiene,
  PetIconImpersonation,
  PetIconMedicalReport,
  PetIconParrot,
  PetIconPet,
  PetIconPetOwner,
  PetIconPig,
  PetIconPills,
  PetIconProcedures,
  PetIconRabbit,
  PetIconSchedule,
  PetIconSettings,
  PetIconShop,
  PetIconSnacks,
  PetIconSnake,
  PetIconToys,
  PetIconTurtle,
  PetIconVaccine,
  PetIconVet,
  PetIconVetConsultation,
} from "../peticons/PetIcons";
import { TranslationKey } from "../../i18n/dictionaries";
import { useI18n } from "../../i18n/I18nContext";

type SidebarButtonDefinition = {
  key: string;
  labelKey: TranslationKey;
  icon: ReactElement;
};

const buttons: SidebarButtonDefinition[] = [
  { key: "vet-consultation", labelKey: "icon.consultations", icon: <PetIconVetConsultation /> },
  { key: "vaccine", labelKey: "icon.vaccines", icon: <PetIconVaccine /> },
  { key: "exams", labelKey: "icon.exams", icon: <PetIconExams /> },
  { key: "procedures", labelKey: "icon.procedures", icon: <PetIconProcedures /> },
  { key: "grooming", labelKey: "nav.grooming", icon: <PetIconGrooming /> },
  { key: "shop", labelKey: "nav.shop", icon: <PetIconShop /> },
  { key: "vet", labelKey: "nav.vet", icon: <PetIconVet /> },
  { key: "hotel", labelKey: "nav.hotel", icon: <PetIconHotel /> },
  { key: "bath", labelKey: "icon.bath", icon: <PetIconBath /> },
  { key: "dressing", labelKey: "icon.dressing", icon: <PetIconDressing /> },
  { key: "grooming-others", labelKey: "icon.groomingOthers", icon: <PetIconGroomingOthers /> },
  { key: "houses", labelKey: "icon.houses", icon: <PetIconHouses /> },
  { key: "beds", labelKey: "icon.beds", icon: <PetIconBeds /> },
  { key: "toys", labelKey: "icon.toys", icon: <PetIconToys /> },
  { key: "food", labelKey: "icon.food", icon: <PetIconFood /> },
  { key: "boxes", labelKey: "icon.boxes", icon: <PetIconBoxes /> },
  { key: "snacks", labelKey: "icon.snacks", icon: <PetIconSnacks /> },
  { key: "pills", labelKey: "icon.pills", icon: <PetIconPills /> },
  { key: "dog", labelKey: "icon.dog", icon: <PetIconDog /> },
  { key: "cat", labelKey: "icon.cat", icon: <PetIconCat /> },
  { key: "snake", labelKey: "icon.snake", icon: <PetIconSnake /> },
  { key: "turtle", labelKey: "icon.turtle", icon: <PetIconTurtle /> },
  { key: "chameleon", labelKey: "icon.chameleon", icon: <PetIconChameleon /> },
  { key: "pig", labelKey: "icon.pig", icon: <PetIconPig /> },
  { key: "guinea", labelKey: "icon.guinea", icon: <PetIconGuinea /> },
  { key: "chinchilla", labelKey: "icon.chinchilla", icon: <PetIconChinchilla /> },
  { key: "rabbit", labelKey: "icon.rabbit", icon: <PetIconRabbit /> },
  { key: "goat", labelKey: "icon.goat", icon: <PetIconGoat /> },
  { key: "cow", labelKey: "icon.cow", icon: <PetIconCow /> },
  { key: "horse", labelKey: "icon.horse", icon: <PetIconHorse /> },
  { key: "parrot", labelKey: "icon.parrot", icon: <PetIconParrot /> },
  { key: "bird", labelKey: "icon.birds", icon: <PetIconBird /> },
  { key: "fish", labelKey: "icon.fish", icon: <PetIconFish /> },
  { key: "medical-report", labelKey: "icon.medicalReport", icon: <PetIconMedicalReport /> },
  { key: "impersonation", labelKey: "icon.impersonation", icon: <PetIconImpersonation /> },
  { key: "attest", labelKey: "icon.attests", icon: <PetIconAttest /> },
  { key: "pet", labelKey: "nav.animals", icon: <PetIconPet /> },
  { key: "pet-owner", labelKey: "nav.tutors", icon: <PetIconPetOwner /> },
  { key: "clothes", labelKey: "icon.clothes", icon: <PetIconClothes /> },
  { key: "collars", labelKey: "icon.collars", icon: <PetIconCollars /> },
  { key: "hygiene", labelKey: "icon.hygiene", icon: <PetIconHygiene /> },
  { key: "hacker", labelKey: "icon.hacker", icon: <PetIconHacker /> },
  { key: "settings", labelKey: "nav.settings", icon: <PetIconSettings /> },
  { key: "schedule", labelKey: "icon.schedule", icon: <PetIconSchedule /> },
];

export default function ButtonShowcase() {
  const { t } = useI18n();

  return (
    <Stack gap="lg" style={{ maxWidth: 980 }}>
      <div>
        <Title order={2}>{t("buttonShowcase.title")}</Title>
        <Text c="dimmed">{t("buttonShowcase.description", { count: buttons.length })}</Text>
      </div>

      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 6, lg: 8 }} spacing="lg">
        {buttons.map((button) => (
          <Stack key={button.key} align="center" gap={6}>
            <Tooltip label={t(button.labelKey)} position="top" zIndex={1600} withinPortal transitionProps={{ duration: 0 }}>
              <button className={sidebarClasses.link} type="button" aria-label={t(button.labelKey)}>
                {button.icon}
              </button>
            </Tooltip>
            <Text size="xs" ta="center" style={{ minHeight: 32 }}>
              {t(button.labelKey)}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
