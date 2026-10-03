import { useEffect, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useI18n } from "../../i18n/I18nContext";
import classes from "./ServiceKanban.module.css";
import { TomaStatusOverlay } from "./TomaStatusOverlay";

type ModuleKind = "veterinary" | "grooming" | "hotel";
type Stage = "waiting" | "execution" | "finished";
type AnimalCard = { id:string; name:string; profile:string; tutor:string; service:string; time:string; stage:Stage };

const mockCards: Record<ModuleKind, AnimalCard[]> = {
  veterinary: [
    { id:"vet-1", name:"Luna", profile:"Cachorro - SRD", tutor:"Ana Martins", service:"Consulta de rotina", time:"09:00", stage:"waiting" },
    { id:"vet-2", name:"Thor", profile:"Cachorro - Golden Retriever", tutor:"Caio Rocha", service:"Vacinação anual", time:"09:40", stage:"waiting" },
    { id:"vet-3", name:"Mia", profile:"Gato - Siamês", tutor:"Paula Nunes", service:"Coleta para exame", time:"10:20", stage:"execution" },
    { id:"vet-4", name:"Bento", profile:"Cachorro - Shih-tzu", tutor:"Rafael Lima", service:"Retorno clínico", time:"08:20", stage:"finished" },
  ],
  grooming: [
    { id:"grm-1", name:"Mel", profile:"Cachorro - Spitz Alemão", tutor:"Clara Souza", service:"Banho e hidratação", time:"09:15", stage:"waiting" },
    { id:"grm-2", name:"Nino", profile:"Cachorro - Poodle", tutor:"Diego Alves", service:"Banho e tosa", time:"10:00", stage:"waiting" },
    { id:"grm-3", name:"Amora", profile:"Cachorro - Yorkshire", tutor:"Lívia Freitas", service:"Tosa higiênica", time:"09:30", stage:"execution" },
    { id:"grm-4", name:"Bob", profile:"Cachorro - Beagle", tutor:"Marcos Reis", service:"Banho", time:"08:30", stage:"finished" },
  ],
  hotel: [
    { id:"htl-1", name:"Fred", profile:"Cachorro - Labrador", tutor:"Joana Melo", service:"Check-in diário", time:"08:00", stage:"waiting" },
    { id:"htl-2", name:"Lola", profile:"Cachorro - Dachshund", tutor:"Bruno Dias", service:"Hospedagem", time:"08:30", stage:"waiting" },
    { id:"htl-3", name:"Simba", profile:"Gato - Maine Coon", tutor:"Carla Luz", service:"Hospedagem felina", time:"Ontem", stage:"execution" },
    { id:"htl-4", name:"Pipoca", profile:"Cachorro - SRD", tutor:"Vitor Sales", service:"Check-out", time:"07:45", stage:"finished" },
  ],
};
const titleKeys = { veterinary:"nav.vet", grooming:"nav.grooming", hotel:"nav.hotel" } as const;
const columns = [
  { stage:"waiting", labelKey:"kanban.waiting", color:"#e1b64f" },
  { stage:"execution", labelKey:"kanban.execution", color:"#7379bd" },
  { stage:"finished", labelKey:"kanban.finished", color:"#3f9d79" },
] as const;

export default function ServiceKanban({ module }: { module:ModuleKind }) {
  const { t } = useI18n();
  const [cards, setCards] = useState(() => mockCards[module].map(card => ({...card})));
  useEffect(() => {
    const resync = () => setCards(mockCards[module].map(card => ({ ...card })));
    const invalidate = (event: Event) => {
      const scope = (event as CustomEvent<{ scope?: string }>).detail?.scope;
      if (scope === module) resync();
    };
    window.addEventListener("kahu:toma-resync", resync);
    window.addEventListener("kahu:toma-invalidation", invalidate);
    return () => { window.removeEventListener("kahu:toma-resync", resync); window.removeEventListener("kahu:toma-invalidation", invalidate); };
  }, [module]);
  const handleDrop = (event:DragEvent<HTMLDivElement>, stage:Stage) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id) setCards(current => current.map(card => card.id === id ? {...card, stage} : card));
  };
  return <Stack gap="md" style={{width:"100%"}}>
    <div><Title order={2}>{t(titleKeys[module])}</Title><Text c="dimmed">{t("kanban.subtitle")}</Text></div>
    <div className={classes.board}>
      {columns.map(column => {
        const items = cards.filter(card => card.stage === column.stage);
        return <Stack key={column.stage} className={classes.column} style={{"--column-color":column.color} as CSSProperties} gap="sm" onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event,column.stage)}>
          <Group className={classes.columnHeader} justify="space-between"><Text fw={800}>{t(column.labelKey)}</Text><Badge color="gray" variant="white" radius="sm">{items.length}</Badge></Group>
          {items.map(card => <Paper key={card.id} className={classes.card} draggable withBorder radius="sm" p="sm" onDragStart={event => event.dataTransfer.setData("text/plain",card.id)}>
            <Group align="flex-start" wrap="nowrap"><img className={classes.animalIcon} src="/icons/009-pet.png" alt="" aria-hidden/><div style={{flex:1,minWidth:0}}>
              <Group justify="space-between" align="flex-start" wrap="nowrap"><Text fw={800}>{card.name}</Text><Text size="xs" c="dimmed">{card.time}</Text></Group>
              <Text size="xs" c="dimmed">{card.profile}</Text><Text size="sm" fw={650} mt={8}>{card.service}</Text><Text size="xs" c="dimmed" mt={3}>{card.tutor}</Text>
            </div></Group>
          </Paper>)}
        </Stack>;
      })}
    </div>
    <TomaStatusOverlay />
  </Stack>;
}
