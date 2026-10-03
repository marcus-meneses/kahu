import React from 'react';
import { Container, Grid, Card, Image, Text, Title, Group, Badge } from '@mantine/core';

interface Pet {
  id: number;
  name: string;
  species: string;
  age: number;
  image: string;
  adopted: boolean;
}

const pets: Pet[] = [
  {
    id: 1,
    name: 'Bella',
    species: 'Dog',
    age: 3,
    image: 'https://placehold.co/150',
    adopted: true,
  },
  {
    id: 2,
    name: 'Max',
    species: 'Cat',
    age: 2,
    image: 'https://placehold.co/150',
    adopted: false,
  },
  {
    id: 3,
    name: 'Luna',
    species: 'Rabbit',
    age: 1,
    image: 'https://placehold.co/150',
    adopted: false,
  },
  {
    id: 3,
    name: 'Luna',
    species: 'Rabbit',
    age: 1,
    image: 'https://placehold.co/150',
    adopted: false,
  },
  {
    id: 3,
    name: 'Luna',
    species: 'Rabbit',
    age: 1,
    image: 'https://placehold.co/150',
    adopted: false,
  },
  {
    id: 3,
    name: 'Luna',
    species: 'Rabbit',
    age: 1,
    image: 'https://placehold.co/150',
    adopted: false,
  },
  {
    id: 3,
    name: 'Luna',
    species: 'Rabbit',
    age: 1,
    image: 'https://placehold.co/150',
    adopted: false,
  },
];

const PetCard: React.FC<{ pet: Pet }> = ({ pet }) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{maxWidth:"150px", display:"flex", flexDirection:"column"}}>
      <Card.Section>
        <Image src={pet.image} alt={pet.name} style={{maxWidth:"150px"}}/>
      </Card.Section>
      <Group align="apart" mt="md" mb="xs">
        <Title order={4}>{pet.name}</Title>
        <Badge color={pet.adopted ? 'green' : 'red'} variant="light">
          {pet.adopted ? 'Adopted' : 'Available'}
        </Badge>
      </Group>
      <Text size="sm" color="dimmed">
        Species: {pet.species}
      </Text>
      <Text size="sm" color="dimmed">
        Age: {pet.age} year(s)
      </Text>
    </Card>
  );
};

const AnimalDash: React.FC = () => {
  return (
    <Container style={{maxWidth:"100%", marginLeft:"80px"}} >
      <Title order={2}   mb="lg">
       
      </Title>
      <Grid display={{ xs: 'flex', md: 'grid' }}   >
        {pets.map((pet) => (
          <Grid.Col key={pet.id}  span={2} >
            <PetCard pet={pet} />
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
};

export default AnimalDash;
