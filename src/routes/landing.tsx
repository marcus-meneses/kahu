import { Link } from "react-router-dom";
import classes from "@css/landing.module.css";

type Feature = { icon: string; title: string; text: string; status: "Disponível" | "Em evolução" };
const features: Feature[] = [
  { icon: "/icons/001-animal-care.png", title: "Tutores e animais conectados", text: "Cadastros completos, busca rápida, imagens, porte, peso, taxonomia e navegação entre cada tutor e seus animais.", status: "Disponível" },
  { icon: "/icons/006-pet-shop.png", title: "Loja e serviços", text: "Catálogo pesquisável de produtos e serviços, carrinho e contexto do animal para a evolução do atendimento e da venda.", status: "Disponível" },
  { icon: "/icons/034-medical-checkup.png", title: "Atendimento veterinário", text: "Uma frente projetada para agenda, histórico clínico, vacinação, exames, prescrições e documentos do animal.", status: "Em evolução" },
  { icon: "/icons/005-pet-grooming.png", title: "Banho, tosa e hospedagem", text: "Reservas, preferências, execução de serviços, permanência e ocorrências ligadas ao animal e ao tutor.", status: "Em evolução" },
];

const foundations = [
  ["Contexto que acompanha o atendimento", "Abra um tutor, consulte seus animais e continue no detalhe certo sem reconstruir sua busca."],
  ["Dados protegidos por cliente", "Sessão, autorização e isolamento de dados são aplicados pelos serviços do ecossistema, não apenas pela tela."],
  ["Feito para operação diária", "Paginação, carregamento sob demanda, filtros persistidos e formulários validados reduzem espera e retrabalho."],
];

const allowOnboarding = () => sessionStorage.setItem("kahu.hotsiteOnboarding", "allowed");

export default function Landing() {
  return <main className={classes.page}>
    <header className={classes.header}>
      <Link to="/" className={classes.brand} aria-label="Kahu"><img src="/logo.svg" alt="" /><span>Kahu</span></Link>
      <nav className={classes.nav} aria-label="Navegação principal"><a href="#recursos">Recursos</a><a href="#plataforma">Plataforma</a><Link to="/login">Entrar</Link><Link to="/create" onClick={allowOnboarding} className={classes.headerAction}>Criar conta</Link></nav>
    </header>

    <section className={classes.hero}>
      <img className={classes.heroImage} src="/photos/5.jpeg" alt="Profissional cuidando de um cão" />
      <div className={classes.heroOverlay} />
      <div className={classes.heroContent}><p className={classes.eyebrow}>Gestão para negócios pet</p><h1>Kahu</h1><p className={classes.lead}>A operação inteira encontra o animal no centro.</p><p className={classes.summary}>Tutores, animais, catálogo e atendimento conectados em uma plataforma preparada para pet shops, clínicas, banho e tosa e hotelaria.</p><div className={classes.actions}><Link to="/create" onClick={allowOnboarding} className={classes.primary}>Criar minha conta</Link><Link to="/login" className={classes.secondary}>Acessar o Kahu</Link></div></div>
    </section>

    <section className={classes.context} id="plataforma"><div><p className={classes.sectionLabel}>Uma visão contínua</p><h2>Do primeiro cadastro ao próximo atendimento.</h2></div><p>O Kahu reúne o contexto que normalmente fica espalhado. A equipe encontra quem é o tutor, conhece o animal, consulta as informações relevantes e segue para o serviço ou a venda sem perder o ponto de partida.</p></section>

    <section className={classes.features} id="recursos"><div className={classes.sectionHeading}><div><p className={classes.sectionLabel}>Plataforma modular</p><h2>O que o Kahu organiza</h2></div><p>Recursos disponíveis hoje e frentes que evoluem sobre a mesma base de dados e identidade.</p></div><div className={classes.featureGrid}>{features.map(feature => <article key={feature.title} className={classes.feature}><div className={classes.iconFrame}><img src={feature.icon} alt="" /></div><span className={feature.status === "Disponível" ? classes.available : classes.roadmap}>{feature.status}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div></section>

    <section className={classes.foundation}><div className={classes.foundationImage}><img src="/photos/2.jpeg" alt="Cão durante atendimento" /></div><div className={classes.foundationContent}><p className={classes.sectionLabel}>Projetado para a rotina real</p><h2>Informação útil, na hora em que ela importa.</h2>{foundations.map(([title,text], index) => <div className={classes.foundationItem} key={title}><span>{String(index+1).padStart(2,"0")}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></section>

    <section className={classes.ecosystem}><p className={classes.sectionLabel}>Base preparada para crescer</p><h2>Uma experiência. Serviços especializados nos bastidores.</h2><p>Kahu cuida da experiência operacional. Zeal concentra dados e regras de negócio, Enhasa protege identidade e sessões, e Skyway gerencia recursos e arquivos. Para a equipe, tudo isso aparece como um único fluxo.</p><div className={classes.ecosystemNames}><span>Kahu <small>operação</small></span><span>Zeal <small>negócio</small></span><span>Enhasa <small>identidade</small></span><span>Skyway <small>arquivos</small></span></div></section>

    <section className={classes.closing}><div><p className={classes.sectionLabel}>Comece pelo essencial</p><h2>Organize hoje a base do seu atendimento.</h2></div><div className={classes.actions}><Link to="/create" onClick={allowOnboarding} className={classes.primary}>Criar minha conta</Link><Link to="/login" className={classes.closingLogin}>Entrar</Link></div></section>
    <footer className={classes.footer}><Link to="/" className={classes.footerBrand}><img src="/logo.svg" alt="" /><strong>Kahu</strong></Link><span>Gestão cuidadosa para negócios pet.</span><Link to="/login">Acessar</Link></footer>
  </main>;
}
