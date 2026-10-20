
class Component extends DCLogic {
  CATS = [
    { id: 'imperiales', name: 'Imperiales', group: 'mate', blurb: 'Boca ancha, virola de alpaca y pie de apoyo. El mate de ceremonia.' },
    { id: 'torpedos', name: 'Torpedos', group: 'mate', blurb: 'Silueta alargada, cuero cosido y virola cincelada. Un clásico con carácter.' },
    { id: 'camioneros', name: 'Camioneros', group: 'mate', blurb: 'Boca amplia y base firme, para cebar en cualquier lado.' },
    { id: 'ranchero', name: 'Ranchero y Galleta', group: 'mate', blurb: 'Formatos criollos, cueros con pelo y terminaciones cálidas.' },
    { id: 'bombillones', name: 'Bombillones', group: 'bombilla', blurb: 'Alpaca cincelada y picos de bronce, en 15 y 18 cm.' },
    { id: 'yerbas', name: 'Yerbas', group: 'yerba', blurb: 'Canarias tradicional, Serena y Té y Jengibre, en paquetes de 1 kg.' },
  ];
  P = [
    { id: 'imperial-premium', cat: 'imperiales', name: 'Mate Imperial Premium', desc: 'Imperial con virola y base de alpaca con pelotitas en bronce.', price: 39999, img: ((window.__resources && window.__resources.mateImg) || 'assets/mate-imperial-premium.jpg'), feat: 1 },
    { id: 'imperial-calabaza', cat: 'imperiales', name: 'Mate Imperial de Calabaza', desc: 'Mate de calabaza forrado en cuero negro, con virola de alpaca labrada con diseño floral y pie de apoyo.', price: 24999 },
    { id: 'imperial-termico', cat: 'imperiales', name: 'Mate Imperial Térmico', desc: 'El formato imperial en versión térmica.', price: 28999 },
    { id: 'imperial-criollo', cat: 'imperiales', name: 'Mate Imperial Criollo', desc: 'Imperial de calabaza pulida con virola de alpaca cincelada y funda de cuero marrón con costura artesanal.', price: 29999 },
    { id: 'torpedo-premium', cat: 'torpedos', name: 'Mate Torpedo Premium', desc: 'Interior de calabaza forrado en cuero premium y virola de alpaca cincelada. Base en alpaca y bronce.', price: 39999, feat: 1 },
    { id: 'torpedo-borravino', cat: 'torpedos', name: 'Mate Torpedo Virola de Alpaca Cincelada', desc: 'Torpedo de calabaza con virola de alpaca cincelada, cuero liso borravino y base ancha de alpaca.', price: 37999 },
    { id: 'torpedo-acero', cat: 'torpedos', name: 'Mate Torpedo Línea Acero', desc: 'Línea ACERO, con virola de acero inoxidable cincelada y acabado negro. Su formato torpedo le da un diseño clásico y distintivo.', price: null },
    { id: 'torpedo-crudo', cat: 'torpedos', name: 'Torpedo Crudo con Base y Anillos', desc: 'Torpedo de alpaca cincelada forrado en cuero crudo, con base en cuero y doble anillo de bronce.', price: 43000, photos: 2, feat: 1 },
    { id: 'torpedo-cincelada', cat: 'torpedos', name: 'Mate Torpedo Virola en Alpaca Cincelada', desc: 'Torpedo con virola en alpaca cincelada.', price: 37999 },
    { id: 'torpedo-repujado', cat: 'torpedos', name: 'Torpedo Alpaca Cincelada c/Cuero', desc: 'Torpedo premium con virola de alpaca cincelada y cuero repujado.', price: 36999 },
    { id: 'camionero-pelo', cat: 'camioneros', name: 'Mate Camionero Criollo con Pelo', desc: 'Camionero de calabaza natural, con boca amplia y base de cuero con pelo y costura cruzada.', price: 19999, feat: 1 },
    { id: 'camionero-criollo', cat: 'camioneros', name: 'Camionero Criollo', desc: 'Camionero de cuero con base de cuero repujada, de estilo criollo y terminación artesanal.', price: 22999 },
    { id: 'camionero-aluminio', cat: 'camioneros', name: 'Camionero Virola de Aluminio', desc: 'Camionero de cuero negro y calabaza natural.', price: 24999 },
    { id: 'ranchero-manchas', cat: 'ranchero', name: 'Mate Ranchero Manchas Blancas', desc: 'Ranchero con cuero de manchas blancas. Muuu.', price: 31999, feat: 1 },
    { id: 'galleta', cat: 'ranchero', name: 'Mate Galleta', desc: 'Mate artesanal de calabaza, con un diseño cálido y natural, con funda de cuero.', price: 27999, stock: false },
    { id: 'coquito-criollo', cat: 'ranchero', name: 'Mate Coquito Criollo', desc: 'Coquito criollo de calabaza, compacto y de mano.', price: 28999 },
    { id: 'yerba-canarias', cat: 'yerbas', name: 'Yerba Canarias 1 kg', desc: 'Canarias tradicional. Paquete de 1 kg.', price: 9999 },
    { id: 'yerba-serena', cat: 'yerbas', name: 'Yerba Canarias Serena 1 kg', desc: 'Canarias Serena, suave y con hierbas. Paquete de 1 kg.', price: 12500, feat: 1 },
    { id: 'yerba-jengibre', cat: 'yerbas', name: 'Yerba Canarias Té y Jengibre 1 kg', desc: 'Canarias con té y jengibre. Paquete de 1 kg.', price: 12500 },
    { id: 'bombillon-curvo-alpaca', cat: 'bombillones', name: 'Bombillón Curvo de Alpaca', desc: 'Bombillón curvo con aro de alpaca y pico de bronce.', price: 28999 },
    { id: 'bombillon-100-alpaca', cat: 'bombillones', name: 'Bombillón 100% Alpaca', desc: 'Realizado íntegramente en alpaca, con pico curvo, caño cincelado y doble dije.', price: 25999, feat: 1 },
    { id: 'bombillon-mini-loro', cat: 'bombillones', name: 'Bombillón Mini Premium Pico Loro (15 cm)', desc: 'Bombillón de alpaca con pico loro de bronce y caño trabajado.', price: 25999, photos: 5 },
    { id: 'bombillon-mini-alpaca', cat: 'bombillones', name: 'Bombillón Mini Alpaca (15 cm)', desc: 'Diseño compacto con pico recto de bronce y caño labrado. Ideal para mates medianos y chicos.', price: 25999, photos: 3 },
    { id: 'bombillon-premium-curvo', cat: 'bombillones', name: 'Bombillón Premium Curvo', desc: 'Pico de rey en bronce, caño trenzado de alpaca y doble anillo de bronce.', price: 28999, photos: 3, feat: 1 },
    { id: 'bombillon-alpaca-18', cat: 'bombillones', name: 'Bombillón Alpaca (18 cm)', desc: 'Bombillón de alpaca con pico recto de bronce, caño labrado y detalles artesanales.', price: 25999, photos: 3 },
    { id: 'bombillon-curvo', cat: 'bombillones', name: 'Bombillón Curvo', desc: '100% alpaca con caño trenzado, detalles labrados y tradicional pala uruguaya.', price: 28999, photos: 2 },
    { id: 'bombillon-loro-18', cat: 'bombillones', name: 'Bombillón Alpaca Pico Loro (18 cm)', desc: 'Bombillón de alpaca con pico loro de bronce y caño torneado.', price: 25999, photos: 6 },
  ];
  SEED = {
    'imperial-premium': [
      { name: 'Martina R.', rating: 5, date: 'Sep 2026', text: 'La virola es una joya y el pie con las pelotitas le da una presencia increíble. Llegó perfecto.' },
      { name: 'Joaquín P.', rating: 5, date: 'Ago 2026', text: 'Lo curé como indicaban y quedó listo en dos días. Se nota el trabajo a mano.' },
      { name: 'Lucía F.', rating: 4, date: 'Jul 2026', text: 'Hermoso. Es más grande de lo que imaginaba, ideal para la ronda larga.' },
    ],
    'torpedo-premium': [
      { name: 'Santiago M.', rating: 5, date: 'Sep 2026', text: 'El cuero es muy prolijo y la base de alpaca pesa lo justo. Un clásico.' },
      { name: 'Carolina B.', rating: 5, date: 'Jun 2026', text: 'Lo regalé y fue un éxito. Vino muy bien embalado.' },
    ],
    'torpedo-crudo': [{ name: 'Tomás G.', rating: 5, date: 'Ago 2026', text: 'El cuero crudo con los anillos de bronce queda buenísimo. Muy bien terminado.' }],
    'camionero-pelo': [
      { name: 'Ignacio L.', rating: 5, date: 'Sep 2026', text: 'Boca amplia, base firme y el pelo le da onda. Lo uso todos los días.' },
      { name: 'Rocío D.', rating: 4, date: 'Jul 2026', text: 'Muy lindo, la costura cruzada es impecable.' },
    ],
    'bombillon-premium-curvo': [
      { name: 'Federico A.', rating: 5, date: 'Sep 2026', text: 'Tira perfecto y no se tapa. El pico de rey en bronce es un lujo.' },
      { name: 'Agustina V.', rating: 5, date: 'Ago 2026', text: 'Pesado, bien hecho y precioso.' },
    ],
    'bombillon-100-alpaca': [{ name: 'Matías C.', rating: 5, date: 'Jul 2026', text: 'Toda de alpaca, se limpia fácil y no se tapa con yerba fina.' }],
    'yerba-serena': [{ name: 'Valentina S.', rating: 5, date: 'Sep 2026', text: 'Suave y rendidora. Ideal para la tarde.' }],
    'ranchero-manchas': [{ name: 'Paula N.', rating: 5, date: 'Ago 2026', text: 'Muuu. Es el mate más lindo que tengo.' }],
  };
  FAQ = [
    { id: 'envios', label: 'Envíos', items: [
      { q: '¿Hacen envíos a todo el país?', a: 'Sí, enviamos a las 24 provincias. El costo y el plazo se calculan en el checkout con tu código postal, y podés elegir envío a domicilio o a sucursal.' },
      { q: '¿Cuánto tarda en llegar mi pedido?', a: 'Preparamos cada pedido apenas se acredita el pago. Cuando lo despachamos te enviamos por mail el número de seguimiento.' },
      { q: '¿Cómo sigo mi pedido?', a: 'Con el número de seguimiento que te llega por mail. Si algo no anda, escribinos a galpon.mates@gmail.com con tu número de pedido.' } ] },
    { id: 'pagos', label: 'Pagos y cuotas', items: [
      { q: '¿Qué medios de pago aceptan?', a: 'Pagás en la web con Mercado Pago: tarjetas de crédito y débito, dinero en cuenta y los demás medios disponibles en la plataforma.' },
      { q: '¿Puedo pagar en cuotas?', a: 'Sí, hasta 3 cuotas sin interés con tarjeta de crédito. Las opciones vigentes se muestran al momento de pagar.' },
      { q: '¿Es seguro pagar en la web?', a: 'El pago lo procesa Mercado Pago. Nosotros nunca vemos ni guardamos los datos de tu tarjeta.' } ] },
    { id: 'curado', label: 'Curado del mate', items: [
      { q: '¿Cómo curo un mate de calabaza?', a: 'Llenalo con yerba usada humedecida con agua tibia y dejalo reposar 24 horas. Al día siguiente vacialo, raspá suave el interior con una cuchara y repetí el proceso 2 o 3 días.' },
      { q: '¿Los mates de acero se curan?', a: 'No hace falta: alcanza con lavarlos con agua caliente antes del primer uso. En los forrados en cuero con interior de calabaza, curá la calabaza igual que en cualquier mate.' },
      { q: '¿Qué hago si aparece una mancha blanca?', a: 'Suele pasar si el mate queda húmedo. Lavalo con agua caliente, dejalo secar boca abajo al aire y, si sigue, repetí el curado.' } ] },
    { id: 'cuidado', label: 'Cuero y alpaca', items: [
      { q: '¿Cómo cuido el cuero?', a: 'Después de cada uso, secá el exterior con un paño. Evitá mojarlo de más y dejarlo al sol o cerca del calor. Cada tanto podés humectarlo con crema para cuero incolora.' },
      { q: '¿Cómo limpio la alpaca y el bronce?', a: 'Con un paño suave y seco. Si se oscurece, frotá con una pasta de bicarbonato y agua, enjuagá y secá bien. Evitá productos abrasivos.' },
      { q: '¿Cómo limpio el bombillón?', a: 'Pasale agua caliente después de cada uso. Una vez por semana dejalo en remojo con agua caliente y bicarbonato, y usá un cepillo fino para el filtro.' } ] },
    { id: 'cambios', label: 'Cambios y devoluciones', items: [
      { q: '¿Puedo cambiar un producto?', a: 'Sí, dentro de los 10 días de recibido, sin uso y en su estado original. Escribinos a galpon.mates@gmail.com con tu número de pedido y coordinamos.' },
      { q: '¿Qué pasa si llegó dañado?', a: 'Escribinos apenas lo recibas, con fotos del producto y del embalaje. Lo resolvemos con un cambio o la devolución del dinero.' },
      { q: '¿Cómo me arrepiento de una compra?', a: 'Tenés 10 días corridos desde que recibís el producto para arrepentirte, sin dar explicaciones. Usá el Botón de arrepentimiento al pie de la página.' } ] },
    { id: 'retiro', label: 'Retiro en persona', items: [
      { q: '¿Puedo retirar mi compra?', a: 'Sí. Elegí “Retiro en persona” en el checkout: no tiene costo y te escribimos por mail para coordinar día, horario y lugar.' },
      { q: '¿Qué necesito para retirar?', a: 'Tu número de pedido y el DNI del titular. Si retira otra persona, avisanos antes por mail.' } ] },
  ];
  CUEROS = [{ id: 'Negro', hex: '#221f22' }, { id: 'Marrón', hex: '#6b4532' }, { id: 'Crudo', hex: '#d7c29e' }, { id: 'Borravino', hex: '#5d1f2d' }];
  VIROLAS = ['Alpaca lisa', 'Alpaca cincelada', 'Acero'];
  PROVS = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];
  SHIP = { domicilio: { label: 'Envío a domicilio', cost: 6500, eta: '3 a 6 días hábiles' }, sucursal: { label: 'Envío a sucursal', cost: 4900, eta: '3 a 6 días hábiles' }, retiro: { label: 'Retiro en persona', cost: 0, eta: 'Coordinamos por mail' } };
  PAGES = ['inicio', 'tienda', 'producto', 'kit', 'checkout', 'nosotros', 'faq', 'contacto'];
  KF = {
    up: [{ opacity: 0, transform: 'translate3d(0,28px,0)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
    rise: [{ transform: 'translate3d(0,108%,0)' }, { transform: 'none' }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
    scale: [{ opacity: 0, transform: 'scale(.9)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
    left: [{ opacity: 0, transform: 'translate3d(-28px,0,0)' }, { opacity: 1, transform: 'none' }],
    clip: [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }],
    bar: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
  };

  glowRef = React.createRef(); progRef = React.createRef(); glassRef = React.createRef(); mainRef = React.createRef();
  cartBtnRef = React.createRef(); badgeRef = React.createRef(); searchRef = React.createRef(); tabRef = React.createRef(); reviewsRef = React.createRef(); curtainRef = React.createRef();

  state = {
    route: this.readHash(),
    cart: this.load('galpon.cart.v1', []),
    cartOpen: false, searchOpen: false, menuOpen: false, q: '',
    shopQ: '', shopSort: 'destacados',
    qty: 1, cuero: 'Negro', virola: 'Alpaca cincelada', img: 0, tab: 'desc',
    kitStep: 0, kit: { mate: null, bombilla: null, yerba: null }, kitCuero: 'Negro',
    myReviews: this.load('galpon.reviews.v1', {}),
    rvOpen: false, rvRating: 0, rvHover: 0, rvName: '', rvText: '', rvErr: '',
    faqCat: 'envios', faqOpen: 0,
    ct: { name: '', email: '', order: '', reason: 'Pedido', msg: '' }, ctErr: {}, ctSent: false, ctBusy: false,
    co: { email: '', name: '', last: '', phone: '', street: '', num: '', apt: '', zip: '', city: '', prov: '', ship: 'domicilio', pay: 'mp', cardNum: '', cardName: '', cardExp: '', cardCvc: '', dni: '', cuotas: '1' },
    coStep: 0, coErr: {}, coBusy: false, order: null, cardFlip: false,
    toast: null, toastOn: false,
    narrow: typeof window !== 'undefined' ? window.innerWidth < 1040 : false,
    copied: false,
  };

  load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  readHash() {
    let h = ''; try { h = decodeURIComponent((location.hash || '').replace(/^#\/?/, '')); } catch (e) {}
    const [page, id] = h.split('/');
    return { page: this.PAGES.includes(page) ? page : 'inicio', id: id || null };
  }
  byId = (id) => this.P.find(p => p.id === id);
  cat = (id) => this.CATS.find(c => c.id === id);
  group = (p) => (p && this.cat(p.cat) || {}).group;
  money = (n) => '$' + Math.round(n).toLocaleString('es-AR');
  disc() { const d = Number(this.props.kitDiscount); return isFinite(d) && this.props.kitDiscount !== undefined && this.props.kitDiscount !== null ? Math.max(0, Math.min(50, d)) : 10; }
  reviewsOf(id) { return [...((this.state.myReviews || {})[id] || []), ...(this.SEED[id] || [])]; }
  norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  go = (page, id) => {
    const h = '#/' + page + (id ? '/' + id : '');
    this.applyRoute({ page, id: id || null });
    try { if (location.hash !== h) history.pushState(null, '', h); } catch (e) {}
  };
  applyRoute(r) {
    const patch = { route: r, menuOpen: false, searchOpen: false, cartOpen: false };
    if (r.page === 'producto') Object.assign(patch, { qty: 1, img: 0, tab: 'desc', rvOpen: false, rvErr: '', cuero: 'Negro', virola: 'Alpaca cincelada' });
    if (r.page === 'kit' && r.id) { const p = this.byId(r.id); if (p && this.group(p) === 'mate') { patch.kit = { ...this.state.kit, mate: r.id }; patch.kitStep = 1; } }
    if (r.page === 'checkout' && !this.state.order) patch.coStep = 0;
    this.setState(patch);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  componentDidMount() {
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, gx: innerWidth / 2, gy: innerHeight / 2, nx: .5, ny: .5, sx: .5, sy: .5 };
    this.els = { par: [], scrub: [], hs: [] };
    this.io = new IntersectionObserver(this.onIO, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    this.mo = new MutationObserver(() => this.scan());
    this.mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', this.onLeave);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('popstate', this.onPop);
    window.addEventListener('hashchange', this.onPop);
    this.scan(); this.onResize();
    this.raf = requestAnimationFrame(this.tick);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf); this.io && this.io.disconnect(); this.mo && this.mo.disconnect();
    window.removeEventListener('pointermove', this.onMove); document.documentElement.removeEventListener('mouseleave', this.onLeave);
    window.removeEventListener('scroll', this.onScroll); window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('popstate', this.onPop); window.removeEventListener('hashchange', this.onPop);
    clearTimeout(this.toastT);
    if (this.m3d) { try { this.m3d.api.dispose(); } catch (e) {} }
  }
  componentDidUpdate(pp, ps) {
    const s = this.state;
    if (ps.route !== s.route && this.mainRef.current) {
      this.mainRef.current.animate([{ opacity: 0, transform: 'translate3d(0,24px,0)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 800, delay: 180, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      const c = this.curtainRef.current; if (c && ps.route.page !== s.route.page) c.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)', offset: .4 }, { transform: 'translateY(0)', offset: .55 }, { transform: 'translateY(-100%)' }], { duration: 900, easing: 'cubic-bezier(.7,0,.3,1)' });
    }
    if (ps.cart !== s.cart) this.save('galpon.cart.v1', s.cart);
    if (ps.myReviews !== s.myReviews) this.save('galpon.reviews.v1', s.myReviews);
    if (!ps.searchOpen && s.searchOpen) setTimeout(() => this.searchRef.current && this.searchRef.current.focus(), 50);
    const gridChanged = (ps.route.id !== s.route.id && s.route.page === 'tienda' && ps.route.page === 'tienda') || ps.shopSort !== s.shopSort;
    if (gridChanged) this.replayGrid();
    if (ps.tab !== s.tab && this.tabRef.current) this.tabRef.current.animate(this.KF.up, { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (ps.coStep !== s.coStep || ps.kitStep !== s.kitStep) { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} }
    if (pp.cursorGlow !== this.props.cursorGlow && this.glowRef.current && this.props.cursorGlow === false) this.glowRef.current.style.opacity = '0';
  }

  scan = () => {
    const d = document;
    d.querySelectorAll('[data-reveal]:not([data-rv])').forEach(el => {
      el.setAttribute('data-rv', '');
      const a = el.animate(this.KF[el.dataset.reveal] || this.KF.up, { duration: +el.dataset.dur || 1000, delay: +el.dataset.delay || 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      a.pause(); el.__rv = a;
      const tgt = (el.dataset.reveal === 'rise' || el.dataset.reveal === 'clip') && el.parentElement ? el.parentElement : el;
      if (tgt !== el) { tgt.__rvKids = (tgt.__rvKids || []).concat(el); }
      this.io.observe(tgt);
    });
    d.querySelectorAll('[data-count]:not([data-cn])').forEach(el => { el.setAttribute('data-cn', ''); this.io.observe(el); });
    d.querySelectorAll('[data-spin]:not([data-an])').forEach(el => { el.setAttribute('data-an', ''); const s = parseFloat(el.dataset.spin) || 30; el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (s < 0 ? -360 : 360) + 'deg)' }], { duration: Math.abs(s) * 1000, iterations: Infinity }); });
    d.querySelectorAll('[data-float]:not([data-an])').forEach((el, i) => { el.setAttribute('data-an', ''); el.animate([{ translate: '0 0' }, { translate: '0 -9px' }, { translate: '0 0' }], { duration: 4200 + (i % 3) * 700, delay: -(i * 900), iterations: Infinity, easing: 'ease-in-out' }); });
    d.querySelectorAll('[data-sweep]:not([data-an])').forEach(el => { el.setAttribute('data-an', ''); const v = el.dataset.sweep === 'v'; el.animate(v ? [{ transform: 'translateY(-16px)' }, { transform: 'translateY(44px)' }] : [{ transform: 'translateY(-110px)' }, { transform: 'translateY(calc(var(--h, 900px)))' }], { duration: v ? 1800 : 4200, iterations: Infinity, easing: v ? 'cubic-bezier(.6,0,.4,1)' : 'linear' }); if (!v) { const ph = el.parentElement.getBoundingClientRect().height || 800; el.getAnimations()[0].effect.setKeyframes([{ transform: 'translateY(-110px)' }, { transform: 'translateY(' + ph + 'px)' }]); } });
    d.querySelectorAll('[data-ping]:not([data-an])').forEach((el, i) => { el.setAttribute('data-an', ''); el.animate([{ boxShadow: '0 0 0 0 color-mix(in srgb, var(--color-accent) 60%, transparent)' }, { boxShadow: '0 0 0 10px color-mix(in srgb, var(--color-accent) 0%, transparent)' }], { duration: 1800, delay: i * 300, iterations: Infinity }); });
    d.querySelectorAll('[data-sheen]:not([data-an])').forEach(el => { el.setAttribute('data-an', ''); el.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { duration: 5200, iterations: Infinity, easing: 'ease-in-out', direction: 'alternate' }); });
    d.querySelectorAll('[data-draw]:not([data-an])').forEach(el => { el.setAttribute('data-an', ''); const L = el.getTotalLength ? el.getTotalLength() : 100; el.style.strokeDasharray = L; el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, delay: 250, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' }); });
    this.els.par = [...d.querySelectorAll('[data-parallax],[data-mouse]')];
    this.els.scrub = [...d.querySelectorAll('[data-scrub]')].map(el => ({ el, w: [...el.querySelectorAll('[data-w]')] }));
    this.els.hs = [...d.querySelectorAll('[data-hscroll]')].map(el => ({ el, sticky: el.querySelector('[data-hsticky]'), track: el.querySelector('[data-track]'), prog: el.querySelector('[data-hprog]') }));
    const mt = d.querySelector('[data-mate]');
    if (mt !== this.mateEl) { this.mateEl = mt; this.mateParts = {}; if (mt) mt.querySelectorAll('[data-m]').forEach(n => { this.mateParts[n.dataset.m] = n; }); this.mateStep = -1; }
    this.init3D();
    this.measureH(); this.dirty = true;
  };
  MATE_STEPS = ['El mate vacío', 'Ponele la yerba', 'Tapá y agitá', 'Hacé la montañita', 'Calzá la bombilla', 'El agua, a 75 °C', 'Cebá el primero', 'Pasalo a la ronda'];
  updateMate() {
    const el = this.mateEl, M = this.mateParts; if (!el || !el.isConnected || !M) return;
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh, p = max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0;
    const N = 8, f = p * N, step = Math.min(N - 1, Math.floor(f)), t = Math.min(1, f - step), cl = (x) => Math.max(0, Math.min(1, x));
    const e = (x) => 1 - Math.pow(1 - cl(x), 3);
    const at = (k) => step > k ? 1 : step === k ? e(t) : 0;
    const fill = at(1), shake = step === 2 ? Math.sin(t * Math.PI * 6) * 16 * (1 - t) : 0, slope = at(3), bomb = at(4), water = at(5), steamO = step >= 6 ? 1 : 0, pass = at(7);
    if (M.yerba) M.yerba.setAttribute('transform', 'translate(0,' + (232 - 134 * fill).toFixed(1) + ') rotate(' + (-20 * slope).toFixed(2) + ' 100 0)');
    if (M.parts) { M.parts.setAttribute('opacity', step === 1 ? '1' : '0'); [...M.parts.children].forEach((c, i) => c.setAttribute('cy', (-10 + (((t * 2.2) + i / 12) % 1) * 110).toFixed(1))); }
    if (M.all) M.all.setAttribute('transform', 'translate(' + (pass * 150).toFixed(1) + ',0) rotate(' + (shake - pass * 8).toFixed(2) + ' 100 160)');
    if (M.bomb) M.bomb.setAttribute('transform', 'translate(0,' + (-170 + 170 * bomb).toFixed(1) + ')');
    if (M.water) M.water.setAttribute('opacity', (water * 0.9).toFixed(2));
    const pouring = (step === 5 && t < .85) || (step === 6 && t < .5);
    if (M.stream) M.stream.setAttribute('opacity', pouring ? '0.85' : '0');
    if (M.kettle) M.kettle.setAttribute('opacity', (step === 5 || step === 6) ? '1' : '0');
    if (M.steam) M.steam.setAttribute('opacity', steamO ? (0.35 + 0.4 * (1 - pass)).toFixed(2) : '0');
    if (M.toma) M.toma.setAttribute('opacity', step === 7 ? e(t * 1.5).toFixed(2) : '0');
    if (M.bar) M.bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    if (step !== this.mateStep) {
      this.mateStep = step;
      if (M.label) { M.label.textContent = this.MATE_STEPS[step]; M.label.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' }); }
      if (M.num) M.num.textContent = String(step + 1).padStart(2, '0') + '/08';
      el.animate([{ boxShadow: '0 0 0 1px var(--color-accent-2-400), 0 0 30px -6px var(--color-accent-2-500)' }, { boxShadow: 'var(--shadow-md)' }], { duration: 900 });
    }
  }
  measureH() {
    for (const h of this.els.hs) { if (!h.track || !h.sticky) continue; const dist = Math.max(0, h.track.scrollWidth - h.sticky.clientWidth); h.dist = dist; h.el.style.height = (h.sticky.clientHeight + dist) + 'px'; }
  }
  onIO = (entries) => entries.forEach(en => {
    if (!en.isIntersecting) return; const el = en.target; this.io.unobserve(el);
    if (el.__rv) el.__rv.play();
    if (el.__rvKids) el.__rvKids.forEach(k => k.__rv && k.__rv.play());
    if (el.dataset.count !== undefined) this.runCount(el);
  });
  runCount(el) {
    const node = [...el.childNodes].find(n => n.nodeType === 3); if (!node) return;
    const dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', t0 = performance.now(), dur = 1800;
    const f = (v) => pre + v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), target = parseFloat(el.dataset.count) || 0; node.nodeValue = f(p >= 1 ? target : target * (1 - Math.pow(2, -10 * p))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  replayGrid() {
    requestAnimationFrame(() => document.querySelectorAll('[data-grid] > *').forEach((el, i) => el.animate(this.KF.up, { duration: 700, delay: Math.min(i, 10) * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })));
  }

  onMove = (e) => {
    const m = this.mouse; m.x = e.clientX; m.y = e.clientY; m.nx = e.clientX / innerWidth; m.ny = e.clientY / innerHeight;
    if (this.m3d) this.m3d.api.mouse(m.nx - .5, m.ny - .5);
    const g = this.glowRef.current; if (g && this.props.cursorGlow !== false && e.pointerType === 'mouse') g.style.opacity = '1';
    if (e.pointerType !== 'mouse') return;
    const t = e.target && e.target.closest ? e.target.closest('[data-tilt]') : null;
    if (t !== this.tiltEl) { if (this.tiltEl) this.resetTilt(this.tiltEl); this.tiltEl = t; if (t) { t.style.setProperty('--hov', '1'); t.style.transition = 'transform .18s ease-out'; } }
    if (t) {
      const r = (t.parentElement || t).getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      const max = t.dataset.tilt === '0' ? 0 : (this.props.tiltStrength ?? 10);
      t.style.transform = 'perspective(1000px) rotateX(' + ((0.5 - py) * max).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * max).toFixed(2) + 'deg)';
      t.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); t.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      t.style.setProperty('--px', (px - 0.5).toFixed(3)); t.style.setProperty('--py', (py - 0.5).toFixed(3));
    }
    const mg = e.target && e.target.closest ? e.target.closest('[data-magnetic]') : null;
    if (mg !== this.magEl) { if (this.magEl && this.magEl.firstElementChild) { const c = this.magEl.firstElementChild; c.style.translate = '0px 0px'; c.style.setProperty('--magT', '.7s'); } this.magEl = mg; }
    if (mg && mg.firstElementChild) { const r = mg.getBoundingClientRect(), s = parseFloat(mg.dataset.magnetic) || .3, c = mg.firstElementChild; if (!c.__magT) { c.__magT = 1; const tr = getComputedStyle(c).transition; c.style.transition = (tr && tr !== 'all 0s ease 0s' && tr !== 'none 0s ease 0s' ? tr + ', ' : '') + 'translate .35s cubic-bezier(.34,1.56,.64,1)'; } c.style.translate = ((e.clientX - r.left - r.width / 2) * s).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * s).toFixed(1) + 'px'; }
  };
  resetTilt(t) { t.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1)'; t.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'; t.style.setProperty('--hov', '0'); t.style.setProperty('--px', '0'); t.style.setProperty('--py', '0'); }
  onLeave = () => { if (this.tiltEl) { this.resetTilt(this.tiltEl); this.tiltEl = null; } const g = this.glowRef.current; if (g) g.style.opacity = '0'; };
  onScroll = () => { this.dirty = true; };
  onResize = () => { const n = innerWidth < 1040; if (n !== this.state.narrow) this.setState({ narrow: n }); this.measureH(); this.dirty = true; };
  onPop = () => { const r = this.readHash(); if (r.page !== this.state.route.page || r.id !== this.state.route.id) this.applyRoute(r); };
  onKey = (e) => {
    if (e.key === 'Escape') { if (this.state.searchOpen || this.state.cartOpen || this.state.menuOpen) this.setState({ searchOpen: false, cartOpen: false, menuOpen: false }); return; }
    const tg = e.target; if (e.key === '/' && !(tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) { e.preventDefault(); this.setState({ searchOpen: true }); }
  };
  tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const m = this.mouse; if (!m) return;
    m.gx += (m.x - m.gx) * .12; m.gy += (m.y - m.gy) * .12; m.sx += (m.nx - m.sx) * .07; m.sy += (m.ny - m.sy) * .07;
    const moving = Math.abs(m.x - m.gx) + Math.abs(m.y - m.gy) > .4 || Math.abs(m.nx - m.sx) + Math.abs(m.ny - m.sy) > .0006;
    if (!moving && !this.dirty) return; this.dirty = false;
    const g = this.glowRef.current; if (g) g.style.transform = 'translate3d(' + (m.gx - 300).toFixed(1) + 'px,' + (m.gy - 300).toFixed(1) + 'px,0)';
    const vh = innerHeight;
    for (const el of this.els.par) {
      if (!el.isConnected) continue;
      const sp = parseFloat(el.dataset.parallax || 0), dp = parseFloat(el.dataset.mouse || 0); let tx = 0, ty = 0;
      if (sp) { const r = el.parentElement.getBoundingClientRect(); ty = (r.top + r.height / 2 - vh / 2) * -sp; }
      if (dp) { tx += (m.sx - .5) * dp; ty += (m.sy - .5) * dp; }
      el.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
    }
    for (const s of this.els.scrub) {
      if (!s.el.isConnected) continue; const r = s.el.getBoundingClientRect(), N = s.w.length;
      const p = Math.max(0, Math.min(1, (vh * .85 - r.top) / (r.height + vh * .35)));
      s.w.forEach((w, i) => { const t = Math.max(0, Math.min(1, (p * (N + 4) - i) / 4)); w.style.opacity = (0.14 + 0.86 * t).toFixed(3); });
    }
    for (const h of this.els.hs) {
      if (!h.el.isConnected || !h.track) continue; const r = h.el.getBoundingClientRect(), span = r.height - vh;
      const p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
      h.track.style.transform = 'translate3d(' + (-p * (h.dist || 0)).toFixed(1) + 'px,0,0)'; if (h.prog) h.prog.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    }
    const max = document.documentElement.scrollHeight - vh, pr = max > 0 ? scrollY / max : 0;
    if (this.progRef.current) this.progRef.current.style.transform = 'scaleX(' + pr.toFixed(4) + ')';
    if (this.glassRef.current) this.glassRef.current.style.opacity = scrollY > 8 ? '1' : '0';
    this.update3D();
  };
  init3D() {
    const cv = document.querySelector('[data-3d]');
    if (this.m3d && (!this.m3d.cv.isConnected || this.m3d.cv !== cv)) { try { this.m3d.api.dispose(); } catch (e) {} this.m3d = null; }
    if (!cv || this.m3d || this.m3dLoading === cv) return;
    this.m3dLoading = cv;
    import((window.__resources && window.__resources.mate3d) || new URL('./mate3d.js', document.baseURI).href).then(mod => mod.createMate3D(cv)).then(api => {
      this.m3dLoading = null; if (!cv.isConnected) { api.dispose(); return; }
      this.m3d = { cv, api }; cv.style.opacity = '1'; this.dirty = true;
    }).catch(err => { this.m3dLoading = null; console.warn('3D no disponible: ' + (err && err.message ? err.message : String(err))); });
  }
  update3D() {
    const M = this.m3d; if (!M || !M.cv.isConnected) return;
    const secs = [...document.querySelectorAll('[data-sc]')]; if (!secs.length) return;
    const vh = innerHeight, vc = vh / 2, cs = secs.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
    const hs = document.querySelector('[data-hscroll]'); if (hs) { const hr = hs.getBoundingClientRect(); cs.push(hr.top + vh * .2); }
    let seg = 0, t = 0;
    if (vc >= cs[cs.length - 1]) { seg = cs.length - 1; t = 0; }
    else if (vc > cs[0]) { for (let k = 0; k < cs.length - 1; k++) if (vc >= cs[k] && vc < cs[k + 1]) { seg = k; t = (vc - cs[k]) / (cs[k + 1] - cs[k]); break; } }
    M.api.set(seg, t);
    const endEl = hs || secs[secs.length - 1], er = endEl.getBoundingClientRect(), o = hs ? Math.max(0, Math.min(1, (er.top + vh * .05) / (vh * .55))) : Math.max(0, Math.min(1, (er.bottom - vh * .25) / (vh * .45)));
    M.cv.style.clipPath = 'none'; M.cv.style.opacity = o.toFixed(3); if (o <= 0) M.api.pause(); else M.api.resume();
    if (seg === 6 || (seg === 5 && t > .5)) {
      const ci = seg === 6 ? Math.min(3, Math.floor(Math.max(0, (vc - cs[6] + vh * .3) / (vh * .2)))) : 0, names = ['Negro', 'Marrón', 'Crudo', 'Borravino'];
      document.querySelectorAll('[data-swatch]').forEach(el => { const on = +el.dataset.swatch === ci; el.style.transform = on ? 'scale(1.18)' : 'scale(1)'; el.style.boxShadow = on ? '0 0 0 3px var(--color-neutral-100), 0 0 0 4px var(--color-bg)' : 'none'; });
      const nm = document.querySelector('[data-swname]'); if (nm) nm.textContent = names[ci];
    }
  }
  cacheRitual() {
    const d = document, st = d.querySelector('[data-stage]');
    if (!st) { this.rit = null; return; }
    if (this.rit && this.rit.stage === st) return;
    const q = (s) => st.querySelector(s);
    this.rit = { stage: st, rig: q('[data-rig]'), cut: q('[data-cut]'), shadow: q('[data-shadow]'), water: q('[data-water]'), yfill: q('[data-yfill]'), mound: q('[data-mound]'), mound2: q('[data-mound2]'), wet: q('[data-wet]'), parts: q('[data-parts]'), bomb: q('[data-bomb]'), steam: q('[data-steam]'),
      cur: null };
    this.rit.pk = this.rit.parts ? [...this.rit.parts.children] : [];
  }
  updateRitual() {
    const d = document; this.cacheRitual(); const R = this.rit; if (!R || !R.stage.isConnected) return;
    const photo = d.querySelector('[data-hero-photo]'), ritual = d.querySelector('[data-ritual]'); if (!photo || !ritual) return;
    const vw = innerWidth, vh = innerHeight, narrow = vw < 900, cl = (x) => Math.max(0, Math.min(1, x)), sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const hp = photo.getBoundingClientRect(), rr = ritual.getBoundingClientRect();
    const span = rr.height - vh, p = span > 0 ? cl(-rr.top / span) : 0, q = sm(1 - rr.top / vh);
    const W = narrow ? Math.min(vw * 0.5, 240) : Math.min(vw * 0.3, 400, vh * 0.62 * 510 / 680), Hr = 680 / 510;
    const A = narrow
      ? [[.5, .64, 0], [.5, .64, 0], [.5, .64, 0], [.5, .64, 0], [.5, .64, 0], [.5, .64, 0], [1.4, .64, 14]]
      : [[.7, .56, 0], [.3, .56, 0], [.69, .56, 0], [.31, .58, 0], [.68, .56, 0], [.64, .54, 0], [1.35, .56, 16]];
    const f = p * 7, i = Math.min(6, Math.floor(f)), t = Math.min(1, f - i), mv = sm((t - .6) / .4);
    const a0 = A[i], a1 = A[Math.min(6, i + 1)];
    const sc = i === 5 ? lerp(1, 1.12, sm(t / .5)) * (1 - mv) + mv * 1 : 1;
    let tw = W * sc, tx = lerp(a0[0], a1[0], mv) * vw - tw / 2, ty = lerp(a0[1], a1[1], mv) * vh - tw * Hr / 2, tr = lerp(a0[2], a1[2], mv);
    if (i === 1) tr += Math.sin(t * Math.PI * 9) * 20 * Math.sin(Math.PI * cl(t / .6)) - 30 * Math.sin(Math.PI * cl(t / .6));
    if (i === 2) tr += -24 * Math.sin(Math.PI * cl(t / .6));
    // detach from hero photo
    const hx = hp.left + hp.width * .2396, hy = hp.top + hp.height * .40625, hw = hp.width * .53125;
    if (rr.top > 0) { tx = lerp(hx, tx, q); ty = lerp(hy, ty, q); tw = lerp(hw, tw, q); tr = lerp(0, tr, q) - Math.sin(Math.PI * q) * 8; }
    const snap = q < 0.015 || !R.cur;
    if (snap) R.cur = { x: tx, y: ty, w: tw, r: tr }; else { const k = .16, c = R.cur; c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.w += (tw - c.w) * k; c.r += (tr - c.r) * k; }
    const c = R.cur;
    R.rig.style.width = c.w.toFixed(1) + 'px';
    R.rig.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0) rotate(' + c.r.toFixed(2) + 'deg)';
    const after = rr.bottom < vh * .6;
    R.stage.style.opacity = after ? String(cl((rr.bottom - vh * .2) / (vh * .4))) : '1';
    R.cut.style.filter = 'sepia(' + (.25 * (1 - q)).toFixed(3) + ') brightness(' + (.78 + .22 * q).toFixed(3) + ') contrast(' + (1.05 + .03 * q).toFixed(3) + ') drop-shadow(0 ' + (30 * q).toFixed(0) + 'px ' + (40 * q).toFixed(0) + 'px rgba(0,0,0,' + (.55 * q).toFixed(2) + '))';
    R.shadow.style.opacity = (q * .9).toFixed(2);
    const bg = d.querySelector('[data-hero-bg]'), gh = d.querySelector('[data-hero-ghost]');
    if (bg) { bg.style.opacity = (1 - .82 * q).toFixed(3); bg.style.filter = 'sepia(.25) brightness(.78) contrast(1.05) blur(' + (q * 14).toFixed(1) + 'px)'; }
    if (gh) gh.style.opacity = (q * .9).toFixed(2);
    // ritual states
    const at = (k, a = 0, b = .6) => i > k ? 1 : i === k ? sm((t - a) / (b - a)) : 0;
    const fill = at(0, .05, .6), slope = at(2, .1, .6), bomb = at(3, .05, .55), wet = at(4, .2, .7), steam = i >= 5 ? sm((f - 5) / .3) : 0;
    R.yfill.setAttribute('opacity', fill.toFixed(3));
    R.mound.setAttribute('opacity', (slope * .8).toFixed(3)); R.mound2.setAttribute('opacity', (slope * .7).toFixed(3));
    const md = 'M' + (60 - 22 * slope).toFixed(1) + ' 30 C' + (62 - 8 * slope).toFixed(1) + ' ' + (22 - 8 * slope).toFixed(1) + ' 78 ' + (16 - 9 * slope).toFixed(1) + ' 100 ' + (15 - 5 * slope).toFixed(1);
    R.mound.setAttribute('d', md + ' L100 30 Z'); R.mound2.setAttribute('d', md);
    R.wet.setAttribute('opacity', (wet * .85).toFixed(3));
    R.parts.style.opacity = i === 0 && t < .7 ? String(sm(t / .1) * (1 - sm((t - .55) / .15))) : '0';
    if (i === 0) R.pk.forEach((el, k) => { el.style.top = ((((t * 3.2) + k / 14) % 1) * 100).toFixed(1) + '%'; });
    R.bomb.style.opacity = bomb > 0 ? '1' : '0';
    R.bomb.style.transform = 'translateY(' + (-160 + 160 * bomb).toFixed(1) + '%) rotate(-15deg)';
    const pour = i === 4 ? Math.sin(Math.PI * cl((t - .05) / .65)) : 0;
    R.water.style.transform = 'scaleY(' + cl(pour * 1.4).toFixed(3) + ')'; R.water.style.opacity = pour > 0 ? '1' : '0';
    R.steam.style.opacity = (steam * (i === 6 ? 1 - mv : 1)).toFixed(3);
    // texts
    d.querySelectorAll('[data-ch]').forEach(el => {
      const k = +el.dataset.ch, l = f - k, o = k === 0 && rr.top > 0 ? 0 : (k === 6 ? sm((l + .05) / .2) : sm((l + .05) / .2) * (1 - sm((l - .62) / .25)));
      el.style.opacity = o.toFixed(3); el.style.filter = 'blur(' + ((1 - o) * 8).toFixed(1) + 'px)';
      el.style.transform = 'translateY(calc(-50% + ' + ((1 - o) * (l < .3 ? 40 : -40)).toFixed(1) + 'px))';
      el.style.pointerEvents = o > .5 ? 'auto' : 'none';
      if (narrow) { el.style.top = '22%'; el.style.left = '20px'; el.style.right = '20px'; el.style.width = 'auto'; }
    });
    d.querySelectorAll('[data-chw]').forEach(el => { const k = +el.dataset.chw, l = f - k, o = rr.top > 0 ? 0 : sm((l + .1) / .25) * (1 - sm((l - .7) / .3)); el.style.opacity = (o * .9).toFixed(3); el.style.transform = 'translateY(-50%) translateX(' + ((.5 - l) * 120).toFixed(1) + 'px)'; });
    const spot = d.querySelector('[data-spot]'); if (spot) spot.style.transform = 'translate3d(' + (c.x + c.w / 2).toFixed(0) + 'px,0,0)';
    const bar = d.querySelector('[data-rbar]'); if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    const num = d.querySelector('[data-rnum]'); if (num) num.textContent = String(i + 1).padStart(2, '0') + '/07';
    if (!snap && (Math.abs(tx - c.x) + Math.abs(ty - c.y) + Math.abs(tw - c.w) + Math.abs(tr - c.r)) > .5) this.dirty = true;
  }

  flash(title, sub) { clearTimeout(this.toastT); this.setState({ toast: { title, sub }, toastOn: true }); this.toastT = setTimeout(() => this.setState({ toastOn: false }), 2800); }
  bump() { const b = this.badgeRef.current; if (b) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)', background: 'var(--color-accent)', color: 'var(--color-bg)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
  fly(x, y) {
    const btn = this.cartBtnRef.current; if (!btn) { this.bump(); return; }
    const r = btn.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
    const dot = document.createElement('div');
    Object.assign(dot.style, { position: 'fixed', left: (x - 7) + 'px', top: (y - 7) + 'px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 20px 6px color-mix(in srgb, var(--color-accent) 60%, transparent)', zIndex: 95, pointerEvents: 'none' });
    document.body.appendChild(dot);
    const a = dot.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx * .45 + 'px,' + (dy * .45 - 140) + 'px) scale(1.5)', offset: .45 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: .3 }], { duration: 780, easing: 'cubic-bezier(.5,0,.4,1)' });
    a.onfinish = () => { dot.remove(); this.bump(); };
  }
  addToCart = (id, qty = 1, opts = {}, e) => {
    const p = this.byId(id); if (!p || typeof p.price !== 'number' || p.stock === false) return;
    const isMate = this.group(p) === 'mate';
    const cuero = isMate ? (opts.cuero || 'Negro') : null, virola = isMate ? (opts.virola || 'Alpaca cincelada') : null;
    const key = [id, cuero || '', virola || ''].join('|');
    this.setState(s => { const cart = s.cart.slice(); const i = cart.findIndex(l => l.key === key); if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + qty }; else cart.push({ key, id, qty, cuero, virola }); return { cart }; });
    this.flash('Agregado al carrito', p.name);
    if (e && e.clientX) this.fly(e.clientX, e.clientY); else this.bump();
  };
  addKit = (e) => {
    const k = this.state.kit; if (!k.mate || !k.bombilla || !k.yerba) return;
    const key = 'kit|' + [k.mate, k.bombilla, k.yerba, this.state.kitCuero].join('|');
    this.setState(s => { const cart = s.cart.slice(); const i = cart.findIndex(l => l.key === key); if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + 1 }; else cart.push({ key, kit: [k.mate, k.bombilla, k.yerba], qty: 1, cuero: s.kitCuero, virola: 'Alpaca cincelada' }); return { cart, kit: { mate: null, bombilla: null, yerba: null }, kitStep: 0 }; });
    this.flash('Kit agregado al carrito', 'Descuento de ' + this.disc() + '% aplicado');
    if (e && e.clientX) this.fly(e.clientX, e.clientY); else this.bump();
    setTimeout(() => this.setState({ cartOpen: true }), 850);
  };
  setLine(key, fn) { this.setState(s => ({ cart: s.cart.map(l => l.key === key ? { ...l, qty: fn(l.qty) } : l).filter(l => l.qty > 0) })); }
  lineVM(l) {
    const D = this.disc();
    if (l.kit) {
      const items = l.kit.map(this.byId).filter(Boolean); if (items.length < 3) return null;
      const base = items.reduce((a, p) => a + p.price, 0), unit = base * (1 - D / 100);
      return { key: l.key, isKit: true, hasImg: false, useSlot: false, name: 'Kit ronda completa', detail: items.map(p => p.name).join(' + ') + ' · Cuero ' + String(l.cuero).toLowerCase(), qty: l.qty, total: unit * l.qty, saving: (base - unit) * l.qty, items, cuero: l.cuero, virola: l.virola };
    }
    const p = this.byId(l.id); if (!p) return null;
    return { key: l.key, isKit: false, hasImg: !!p.img, useSlot: !p.img, img: p.img || '', slotId: 'foto-' + p.id, name: p.name, detail: l.cuero ? 'Cuero ' + l.cuero.toLowerCase() + ' · ' + l.virola : (this.cat(p.cat) || {}).name, qty: l.qty, total: p.price * l.qty, saving: 0, items: [p], cuero: l.cuero, virola: l.virola };
  }
  vm(p) {
    const c = this.cat(p.cat) || {}, rv = this.reviewsOf(p.id), n = rv.length, avg = n ? rv.reduce((a, r) => a + r.rating, 0) / n : 0;
    const has = typeof p.price === 'number', buy = has && p.stock !== false;
    return {
      id: p.id, name: p.name, desc: p.desc, catName: c.name, catId: p.cat, group: c.group, photos: p.photos || 1,
      img: p.img || '', hasImg: !!p.img, noImg: !p.img, slotId: 'foto-' + p.id, placeholder: p.name,
      price: p.price, priceLabel: has ? this.money(p.price) : 'Consultar', hasPrice: has, noPrice: !has,
      cuotasLabel: has ? '3 cuotas de ' + this.money(p.price / 3) : 'Precio a confirmar',
      soldOut: p.stock === false, canBuy: buy, cantBuy: !buy,
      hasReviews: n > 0, avg, ratingLabel: n ? avg.toFixed(1).replace('.', ',') : '', reviewsCount: n,
      code: 'N°' + String(this.P.indexOf(p) + 1).padStart(2, '0'), href: '#/producto/' + p.id,
      open: (e) => { if (e && e.preventDefault) e.preventDefault(); this.go('producto', p.id); },
      openCap: (e) => { e.stopPropagation(); e.preventDefault(); this.go('producto', p.id); },
      add: (e) => { if (e) { e.stopPropagation(); e.preventDefault && e.preventDefault(); } this.addToCart(p.id, 1, {}, e); },
    };
  }
  stars(v) { return [1, 2, 3, 4, 5].map(i => ({ i, o: v >= i - 0.25 ? 1 : 0.22 })); }
  setCo = (k, v) => this.setState(s => ({ co: { ...s.co, [k]: v }, coErr: { ...s.coErr, [k]: '' } }));
  validateCo(step) {
    const c = this.state.co, err = {};
    if (step === 0) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) err.email = 'Ingresá un email válido'; if (!c.name.trim()) err.name = 'Requerido'; if (!c.last.trim()) err.last = 'Requerido'; }
    if (step === 1 && c.ship !== 'retiro') {
      if (!/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(c.zip.trim())) err.zip = 'Código postal inválido'; if (!c.city.trim()) err.city = 'Requerido'; if (!c.prov) err.prov = 'Elegí una provincia';
      if (c.ship === 'domicilio') { if (!c.street.trim()) err.street = 'Requerido'; if (!c.num.trim()) err.num = 'Requerido'; }
    }
    if (step === 2 && c.pay === 'card') {
      const n = c.cardNum.replace(/\D/g, ''); if (n.length < 15) err.cardNum = 'Número incompleto';
      if (!c.cardName.trim()) err.cardName = 'Como figura en la tarjeta';
      const m = /^(\d{2})\/(\d{2})$/.exec(c.cardExp); if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < 2026 * 12 + 10) err.cardExp = 'Vencimiento inválido';
      if (!/^\d{3,4}$/.test(c.cardCvc)) err.cardCvc = 'CVC inválido'; if (!/^\d{7,8}$/.test(c.dni)) err.dni = 'DNI inválido';
    }
    return err;
  }
  coNext = () => {
    const step = this.state.coStep, err = this.validateCo(step);
    if (Object.keys(err).length) { this.setState({ coErr: err }); requestAnimationFrame(() => { const f = document.querySelector('[data-bad="1"]'); if (f) f.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 380 }); }); return; }
    if (step < 2) { this.setState({ coStep: step + 1, coErr: {} }); return; }
    this.setState({ coBusy: true });
    setTimeout(() => {
      const s = this.state, lines = s.cart.map(l => this.lineVM(l)).filter(Boolean), sub = lines.reduce((a, l) => a + l.total, 0), ship = this.SHIP[s.co.ship];
      const order = { id: 'GLP-' + Math.floor(10000 + Math.random() * 90000), email: s.co.email, name: s.co.name, lines: lines.map(l => ({ name: l.name, qty: l.qty, totalLabel: this.money(l.total) })), shipLabel: ship.label, shipCost: ship.cost, total: sub + ship.cost, pay: s.co.pay === 'mp' ? 'Mercado Pago' : 'Tarjeta' };
      this.setState({ coBusy: false, order, coStep: 3, cart: [] });
    }, 2200);
  };

  renderVals() {
    const s = this.state, r = s.route, page = r.page, D = this.disc();
    const all = this.P.map(p => this.vm(p)), V = Object.fromEntries(all.map(v => [v.id, v]));
    const navKeys = ['inicio', 'tienda', 'kit', 'nosotros', 'faq', 'contacto'], nav = {}, navOn = {}, navC = {};
    navKeys.forEach(k => { nav[k] = (e) => { if (e && e.preventDefault) e.preventDefault(); this.go(k); }; const on = page === k || (k === 'tienda' && page === 'producto'); navOn[k] = on ? 1 : 0; navC[k] = on ? 'var(--color-text)' : 'var(--color-neutral-400)'; });
    const hv = this.props.heroVariant || 'Órbita';
    const lines = this.CATS.map((c, i) => {
      const n = this.P.filter(p => p.cat === c.id).length;
      const go = (e) => { if (e && e.preventDefault) e.preventDefault(); this.go('tienda', c.id); };
      return { ...c, n: String(i + 1).padStart(2, '0'), countLabel: n + (n === 1 ? ' pieza' : ' piezas'), count: n, hasImg: c.id === 'imperiales', noImg: c.id !== 'imperiales', img: ((window.__resources && window.__resources.mateImg) || 'assets/mate-imperial-premium.jpg'), slotId: 'linea-' + c.id, placeholder: 'Foto · ' + c.name, href: '#/tienda/' + c.id, go, goCap: (e) => { e.stopPropagation(); go(e); } };
    });
    const cartLines = s.cart.map(l => this.lineVM(l)).filter(Boolean).map(l => ({ ...l, totalLabel: this.money(l.total), hasSaving: l.saving > 0, savingLabel: this.money(l.saving), inc: () => this.setLine(l.key, q => q + 1), dec: () => this.setLine(l.key, q => q - 1), remove: () => this.setLine(l.key, () => 0) }));
    const cartCount = cartLines.reduce((a, l) => a + l.qty, 0), subtotal = cartLines.reduce((a, l) => a + l.total, 0), savings = cartLines.reduce((a, l) => a + l.saving, 0);
    const qn = this.norm(s.q.trim()), qResults = qn ? all.filter(v => this.norm(v.name + ' ' + v.desc + ' ' + v.catName).includes(qn)).slice(0, 6) : [];
    const homeReviews = [['imperial-premium', 0], ['bombillon-premium-curvo', 0], ['camionero-pelo', 0]].map(([id, i], k) => { const rv = this.SEED[id][i], v = V[id]; return { ...rv, stars: this.stars(rv.rating), product: v.name, href: v.href, open: v.open, delay: String(k * 120) }; });
    const ret = {
      glowRef: this.glowRef, progRef: this.progRef, glassRef: this.glassRef, mainRef: this.mainRef, cartBtnRef: this.cartBtnRef, badgeRef: this.badgeRef, searchRef: this.searchRef, tabRef: this.tabRef, reviewsRef: this.reviewsRef, curtainRef: this.curtainRef, mateW: s.narrow ? '128px' : '176px',
      nav, navOn, navC, wide: !s.narrow, narrow: s.narrow, menuOpen: s.menuOpen && s.narrow, toggleMenu: () => this.setState(x => ({ menuOpen: !x.menuOpen })),
      isHome: page === 'inicio', isShop: page === 'tienda', isProduct: page === 'producto', isKit: page === 'kit', isCheckout: page === 'checkout', isAbout: page === 'nosotros', isFaq: page === 'faq', isContact: page === 'contacto',
      heroA: hv === 'Órbita', heroB: hv === 'Monumental', heroC: hv === 'Ficha técnica', heroP: V['imperial-premium'],
      cardVariant: this.props.cardVariant || 'Vitrina', kitOff: '−' + D + '%', kitPct: D,
      storyBomb: V['bombillon-premium-curvo'], storyBomb2: V['bombillon-100-alpaca'], storyYerba: V['yerba-canarias'], storyYerba2: V['yerba-serena'], storyYerba3: V['yerba-jengibre'],
      lines, lineGo: Object.fromEntries(lines.map(c => [c.id, c.go])), featured: all.filter(v => this.byId(v.id).feat), homeReviews,
      kitCounts: { mate: this.P.filter(p => this.group(p) === 'mate').length + ' opciones', bombilla: this.P.filter(p => p.cat === 'bombillones').length + ' opciones', yerba: this.P.filter(p => p.cat === 'yerbas').length + ' opciones' },
      cartCount, cartLines, cartEmpty: cartLines.length === 0, cartHas: cartLines.length > 0, subtotalLabel: this.money(subtotal), hasSavings: savings > 0, savingsLabel: this.money(savings),
      cartO: s.cartOpen ? 1 : 0, cartPE: s.cartOpen ? 'auto' : 'none', cartX: s.cartOpen ? 'translateX(0)' : 'translateX(105%)',
      openCart: () => this.setState({ cartOpen: true, toastOn: false }), closeCart: () => this.setState({ cartOpen: false }), goCheckout: () => this.go('checkout'),
      searchOpen: s.searchOpen, q: s.q, qEmpty: !qn, qResults, qNone: !!qn && qResults.length === 0, qHas: qResults.length > 0,
      openSearch: () => this.setState({ searchOpen: true }), closeSearch: () => this.setState({ searchOpen: false }), stop: (e) => e.stopPropagation(),
      setQ: (e) => this.setState({ q: e.target.value }),
      searchAll: () => { this.setState({ shopQ: s.q }); this.go('tienda'); },
      searchKey: (e) => { if (e.key === 'Enter') { if (qResults.length === 1) qResults[0].open(); else { this.setState({ shopQ: s.q }); this.go('tienda'); } } },
      toastTitle: s.toast ? s.toast.title : '', toastSub: s.toast ? s.toast.sub : '', toastO: s.toastOn ? 1 : 0, toastY: s.toastOn ? 'translateY(0)' : 'translateY(140%)', toastPE: s.toastOn ? 'auto' : 'none',
      faqGo: Object.fromEntries(this.FAQ.map(c => [c.id, (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ faqCat: c.id, faqOpen: 0 }); this.go('faq'); }])),
      arrepentimiento: (e) => { if (e && e.preventDefault) e.preventDefault(); this.setState(x => ({ ct: { ...x.ct, reason: 'Arrepentimiento' }, ctSent: false })); this.go('contacto'); },
    };
    Object.assign(ret, this.pageVals(V, all, cartLines, subtotal, savings));
    return ret;
  }

  pageVals(V, all, cartLines, subtotal, savings) {
    const s = this.state, r = s.route, D = this.disc(), out = {};
    // Tienda
    const shopCat = r.page === 'tienda' && r.id && this.cat(r.id) ? r.id : 'todos', q = this.norm(s.shopQ.trim());
    let list = all.filter(v => (shopCat === 'todos' || v.catId === shopCat) && (!q || this.norm(v.name + ' ' + v.desc + ' ' + v.catName).includes(q)));
    const pr = (v) => v.hasPrice ? v.price : Infinity;
    if (s.shopSort === 'destacados') list = list.slice().sort((a, b) => (this.byId(b.id).feat ? 1 : 0) - (this.byId(a.id).feat ? 1 : 0));
    if (s.shopSort === 'menor') list = list.slice().sort((a, b) => pr(a) - pr(b));
    if (s.shopSort === 'mayor') list = list.slice().sort((a, b) => (b.hasPrice ? b.price : -1) - (a.hasPrice ? a.price : -1));
    if (s.shopSort === 'az') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const cc = shopCat === 'todos' ? null : this.cat(shopCat);
    Object.assign(out, {
      shopList: list, shopHas: list.length > 0, shopEmpty: list.length === 0, shopQ: s.shopQ, shopSort: s.shopSort, shopHasQ: !!q,
      shopTitle: cc ? cc.name : 'Todo el catálogo', shopBlurb: cc ? cc.blurb : 'Mates, bombillones y yerba. Elegí, sumá al carrito y pagá online.',
      shopCountLabel: list.length + (list.length === 1 ? ' pieza' : ' piezas'),
      shopCats: [{ id: 'todos', name: 'Todos' }, ...this.CATS].map(c => { const on = c.id === shopCat; return { ...c, count: c.id === 'todos' ? this.P.length : this.P.filter(p => p.cat === c.id).length, color: on ? 'var(--color-accent-200)' : 'var(--color-neutral-300)', bg: on ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent', border: on ? 'var(--color-accent)' : 'var(--color-neutral-800)', glow: on ? '0 0 20px -6px var(--color-accent)' : 'none', go: () => this.go('tienda', c.id === 'todos' ? null : c.id) }; }),
      setShopQ: (e) => this.setState({ shopQ: e.target.value }), setShopSort: (e) => this.setState({ shopSort: e.target.value }), clearShop: () => { this.setState({ shopQ: '' }); this.go('tienda'); },
    });
    // Producto
    const prod = r.page === 'producto' ? this.byId(r.id) : null, pd = prod ? V[prod.id] : null;
    out.pdOk = !!pd; out.pdMissing = r.page === 'producto' && !pd;
    if (pd) {
      const grp = pd.group, n = pd.photos, rv = this.reviewsOf(pd.id), cnt = rv.length, avg = pd.avg;
      const dist = [5, 4, 3, 2, 1].map(k => { const c = rv.filter(x => x.rating === k).length; return { k, n: c, pct: cnt ? Math.round(c / cnt * 100) + '%' : '0%' }; });
      const T = {
        mate: { desc: pd.desc + ' Cada pieza es artesanal: los tonos de la calabaza, el cuero y el cincelado pueden variar.', mat: 'Calabaza natural curable, virola de alpaca o acero según variante, cuero vacuno cosido a mano y base de alpaca o cuero según el modelo.', cuidado: 'Curalo antes del primer uso. Después de cada ronda, secalo boca abajo y evitá el sol directo sobre el cuero. Más detalles en Preguntas frecuentes.' },
        bombilla: { desc: pd.desc, mat: 'Alpaca con detalles de bronce según el modelo. Filtro tipo pala.', cuidado: 'Agua caliente después de cada uso y, una vez por semana, remojo con agua caliente y bicarbonato.' },
        yerba: { desc: pd.desc, mat: 'Paquete de 1 kg, envasado de fábrica.', cuidado: 'Guardala en un lugar fresco y seco; una vez abierta, mejor en un frasco hermético.' },
      }[grp] || {};
      T.envio = 'Enviamos a todo el país: calculás el costo en el checkout con tu código postal. También podés retirar sin costo. Tenés 10 días desde que lo recibís para cambios o arrepentimiento.';
      const tabsDef = [['desc', 'Descripción'], ['mat', grp === 'yerba' ? 'Contenido' : 'Materiales'], ['envio', 'Envío y cambios'], ['cuidado', grp === 'yerba' ? 'Conservación' : 'Cuidado']];
      let rel = all.filter(v => v.catId === pd.catId && v.id !== pd.id); if (rel.length < 4) rel = rel.concat(all.filter(v => v.group === grp && v.catId !== pd.catId)); rel = rel.slice(0, 4);
      const rvShown = s.rvHover || s.rvRating, starWords = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
      Object.assign(out, {
        pd, pdIsMate: grp === 'mate', pdMulti: n > 1, pdShowImg: !!pd.img && s.img === 0, pdShowSlot: !(pd.img && s.img === 0),
        pdSlotId: s.img === 0 ? 'foto-' + pd.id : 'foto-' + pd.id + '-' + (s.img + 1), pdSlotLabel: 'Foto ' + (s.img + 1) + ' · ' + pd.name, pdImgLabel: String(s.img + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'),
        pdThumbs: Array.from({ length: n }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), color: i === s.img ? 'var(--color-text)' : 'var(--color-neutral-500)', line: i === s.img ? 'var(--color-accent)' : 'var(--color-neutral-800)', go: () => this.setState({ img: i }) })),
        pdPrev: () => this.setState(x => ({ img: (x.img - 1 + n) % n })), pdNext: () => this.setState(x => ({ img: (x.img + 1) % n })),
        pdCuotas: pd.hasPrice ? 'o 3 cuotas sin interés de ' + this.money(pd.price / 3) : '',
        pdStock: pd.soldOut ? 'Sin stock por ahora' : 'En stock · listo para despachar', pdStockColor: pd.soldOut ? 'var(--color-neutral-500)' : 'var(--color-accent-2-400)',
        goCat: () => this.go('tienda', pd.catId),
        cuero: s.cuero, virola: s.virola, qty: s.qty,
        cueros: this.CUEROS.map(c => ({ ...c, ring: s.cuero === c.id ? '0 0 0 2px var(--color-bg), 0 0 0 3px var(--color-accent), 0 0 18px -2px var(--color-accent)' : '0 0 0 1px var(--color-neutral-700)', scale: s.cuero === c.id ? 'scale(1.08)' : 'scale(1)', pick: () => this.setState({ cuero: c.id }) })),
        virolas: this.VIROLAS.map(v => ({ id: v, on: s.virola === v, pick: () => this.setState({ virola: v }) })),
        incQty: () => this.setState(x => ({ qty: Math.min(20, x.qty + 1) })), decQty: () => this.setState(x => ({ qty: Math.max(1, x.qty - 1) })),
        addDetail: (e) => this.addToCart(pd.id, s.qty, { cuero: s.cuero, virola: s.virola }, e),
        buyNow: () => { this.addToCart(pd.id, s.qty, { cuero: s.cuero, virola: s.virola }); this.go('checkout'); },
        kitWith: () => this.go('kit', pd.id),
        mailConsulta: 'mailto:galpon.mates@gmail.com?subject=' + encodeURIComponent('Consulta: ' + pd.name),
        pdTabs: tabsDef.map(([id, label]) => ({ id, label, color: s.tab === id ? 'var(--color-text)' : 'var(--color-neutral-400)', line: s.tab === id ? 1 : 0, go: () => this.setState({ tab: id }) })),
        pdTabText: T[s.tab] || '',
        rvList: rv.map(x => ({ ...x, stars: this.stars(x.rating), mineLabel: x.mine ? 'Tu reseña' : 'Compra verificada' })),
        rvNone: cnt === 0, rvSome: cnt > 0, rvAvgNum: avg ? +avg.toFixed(1) : 0, rvAvgLabel: cnt ? avg.toFixed(1).replace('.', ',') : '—', rvAvgStars: this.stars(avg),
        rvCountLabel: cnt ? cnt + (cnt === 1 ? ' reseña' : ' reseñas') : 'Todavía no hay reseñas', rvDist: dist,
        rvOpen: s.rvOpen, rvName: s.rvName, rvText: s.rvText, rvErr: s.rvErr, rvHasErr: !!s.rvErr, rvStarLabel: starWords[rvShown] || 'Elegí una puntuación',
        rvStars: [1, 2, 3, 4, 5].map(i => ({ i, label: i + ' estrellas', color: rvShown >= i ? 'var(--color-accent)' : 'var(--color-neutral-700)', scale: s.rvHover === i ? 'scale(1.2)' : 'scale(1)', set: () => this.setState({ rvRating: i, rvErr: '' }), hover: () => this.setState({ rvHover: i }) })),
        rvLeave: () => this.setState({ rvHover: 0 }), rvToggle: () => this.setState(x => ({ rvOpen: !x.rvOpen, rvErr: '' })),
        setRvName: (e) => this.setState({ rvName: e.target.value }), setRvText: (e) => this.setState({ rvText: e.target.value, rvErr: '' }),
        toReviews: () => { const el = this.reviewsRef.current; if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' }); },
        rvSubmit: () => {
          if (!s.rvRating) return this.setState({ rvErr: 'Elegí una puntuación de 1 a 5 estrellas.' });
          if (s.rvText.trim().length < 10) return this.setState({ rvErr: 'Contanos un poco más (mínimo 10 caracteres).' });
          const d = new Date(), mo = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][d.getMonth()];
          const item = { name: s.rvName.trim() || 'Anónimo', rating: s.rvRating, text: s.rvText.trim(), date: mo + ' ' + d.getFullYear(), mine: true };
          this.setState(x => ({ myReviews: { ...x.myReviews, [pd.id]: [item, ...((x.myReviews || {})[pd.id] || [])] }, rvOpen: false, rvRating: 0, rvName: '', rvText: '', rvErr: '' }));
          this.flash('¡Gracias por tu reseña!', 'Ya está publicada');
        },
        related: rel,
      });
    }
    // Kit
    const groups = ['mate', 'bombilla', 'yerba'], gkey = groups[s.kitStep], picked = {};
    groups.forEach(g => { picked[g] = s.kit[g] ? V[s.kit[g]] : null; });
    const opts = gkey ? all.filter(v => v.group === gkey && v.canBuy) : [];
    const base = groups.reduce((a, g) => a + (picked[g] ? picked[g].price : 0), 0), ready = groups.every(g => picked[g]);
    const done = groups.filter(g => picked[g]).length;
    Object.assign(out, {
      kitStep: s.kitStep, kitPicking: s.kitStep < 3, kitReview: s.kitStep === 3, kitProg: (Math.min(s.kitStep, 3) / 3).toFixed(3),
      kitTitle: ['Elegí el mate', 'Elegí la bombilla', 'Elegí la yerba'][s.kitStep] || '', kitHint: ['16 mates entre imperiales, torpedos, camioneros y rancheros.', 'Bombillones de alpaca con picos de bronce.', 'Yerba Canarias en sus tres versiones.'][s.kitStep] || '',
      kitSteps: ['Mate', 'Bombilla', 'Yerba', 'Resumen'].map((label, i) => { const isDone = i < 3 ? !!picked[groups[i]] : ready, on = s.kitStep === i; return { label, mark: isDone && !on ? '✓' : String(i + 1).padStart(2, '0'), pick: i < 3 ? (picked[groups[i]] ? picked[groups[i]].name : 'Sin elegir') : (ready ? 'Listo para agregar' : 'Faltan ' + (3 - done)), bg: on ? 'var(--color-accent)' : isDone ? 'var(--color-accent-800)' : 'var(--color-bg)', color: on ? 'var(--color-bg)' : isDone ? 'var(--color-accent-100)' : 'var(--color-neutral-400)', ring: on ? '0 0 0 4px color-mix(in srgb, var(--color-accent) 25%, transparent), 0 0 20px var(--color-accent)' : '0 0 0 1px var(--color-neutral-700)', labelColor: on ? 'var(--color-text)' : 'var(--color-neutral-400)', go: () => this.setState({ kitStep: i }) }; }),
      kitOptions: opts.map(v => { const sel = s.kit[gkey] === v.id; return { ...v, sel, ring: sel ? '0 0 0 1px var(--color-accent), 0 0 30px -8px var(--color-accent)' : 'var(--shadow-sm)', checkO: sel ? 1 : 0, checkS: sel ? 'scale(1)' : 'scale(.4)', pick: () => { this.setState(x => ({ kit: { ...x.kit, [gkey]: v.id } })); clearTimeout(this.kitT); this.kitT = setTimeout(() => this.setState(x => ({ kitStep: Math.min(3, x.kitStep + 1) })), 420); } }; }),
      kitSlots: groups.map((g, i) => ({ label: ['Mate', 'Bombilla', 'Yerba'][i], has: !!picked[g], none: !picked[g], name: picked[g] ? picked[g].name : 'Sin elegir', price: picked[g] ? picked[g].priceLabel : '—', go: () => this.setState({ kitStep: i }) })),
      kitHasMate: !!picked.mate, kitCuero: s.kitCuero,
      kitCueros: this.CUEROS.map(c => ({ ...c, ring: s.kitCuero === c.id ? '0 0 0 2px var(--color-surface), 0 0 0 3px var(--color-accent)' : '0 0 0 1px var(--color-neutral-700)', pick: () => this.setState({ kitCuero: c.id }) })),
      kitBaseLabel: this.money(base), kitSaveLabel: '−' + this.money(base * D / 100), kitTotalLabel: this.money(base * (1 - D / 100)), kitReady: ready, kitNotReady: !ready, kitMissing: ready ? '' : 'Te falta elegir ' + groups.filter(g => !picked[g]).map(g => ({ mate: 'el mate', bombilla: 'la bombilla', yerba: 'la yerba' })[g]).join(', '),
      addKit: this.addKit, kitReset: () => this.setState({ kit: { mate: null, bombilla: null, yerba: null }, kitStep: 0 }), kitToReview: () => this.setState({ kitStep: 3 }),
    });
    // Checkout
    const c = s.co, err = s.coErr, ship = this.SHIP[c.ship], shipKnown = s.coStep >= 1;
    const num = c.cardNum.replace(/\D/g, ''), brand = /^3[47]/.test(num) ? 'AMEX' : /^4/.test(num) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(num) ? 'MASTERCARD' : 'TARJETA';
    const padded = (num + '•'.repeat(16)).slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    const total = subtotal + (shipKnown ? ship.cost : 0);
    const onF = {}; ['email', 'name', 'last', 'phone', 'street', 'num', 'apt', 'zip', 'city', 'prov', 'cardName'].forEach(k => { onF[k] = (e) => this.setCo(k, e.target.value); });
    onF.cardNum = (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 16); this.setCo('cardNum', d.replace(/(\d{4})(?=\d)/g, '$1 ')); };
    onF.cardExp = (e) => { let d = e.target.value.replace(/\D/g, '').slice(0, 4); if (d.length > 2) d = d.slice(0, 2) + '/' + d.slice(2); this.setCo('cardExp', d); };
    onF.cardCvc = (e) => this.setCo('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4));
    onF.dni = (e) => this.setCo('dni', e.target.value.replace(/\D/g, '').slice(0, 8));
    onF.cuotas = (e) => this.setCo('cuotas', e.target.value);
    const bad = {}, bd = {}; Object.keys(c).forEach(k => { bad[k] = err[k] ? '1' : '0'; bd[k] = err[k] ? 'oklch(0.72 0.14 25)' : ''; });
    const has = {}; Object.keys(c).forEach(k => { has[k] = !!err[k]; });
    Object.assign(out, {
      co: c, coErr: err, coHas: has, coBad: bad, coBd: bd, coOn: onF, coStep: s.coStep, coBusy: s.coBusy, coIdle: !s.coBusy,
      co0: s.coStep === 0, co1: s.coStep === 1, co2: s.coStep === 2, coDone: s.coStep === 3 && !!s.order, coForm: s.coStep < 3,
      coEmpty: s.coStep < 3 && cartLines.length === 0, coReady: s.coStep < 3 && cartLines.length > 0,
      coSteps: ['Contacto', 'Envío', 'Pago'].map((label, i) => ({ label, n: String(i + 1).padStart(2, '0'), color: i <= s.coStep ? 'var(--color-text)' : 'var(--color-neutral-500)', line: i <= s.coStep ? 1 : 0, go: () => { if (i < s.coStep) this.setState({ coStep: i }); } })),
      coBack: () => this.setState(x => ({ coStep: Math.max(0, x.coStep - 1), coErr: {} })), coNext: this.coNext, coHasBack: s.coStep > 0,
      coNextLabel: s.coStep < 2 ? 'Continuar' : (c.pay === 'mp' ? 'Pagar ' + this.money(total) + ' con Mercado Pago' : 'Pagar ' + this.money(total)),
      coBusyLabel: c.pay === 'mp' ? 'Conectando con Mercado Pago…' : 'Procesando pago seguro…',
      shipOpts: Object.entries(this.SHIP).map(([id, o]) => ({ id, ...o, costLabel: o.cost ? this.money(o.cost) : 'Gratis', on: c.ship === id, ring: c.ship === id ? '0 0 0 1px var(--color-accent), 0 0 24px -10px var(--color-accent)' : '0 0 0 1px var(--color-neutral-800)', dot: c.ship === id ? 'inset 0 0 0 4px var(--color-bg)' : 'none', dotBg: c.ship === id ? 'var(--color-accent)' : 'transparent', pick: () => this.setCo('ship', id) })),
      shipNeedsAddr: c.ship !== 'retiro', shipHome: c.ship === 'domicilio', shipPickup: c.ship === 'retiro',
      provs: this.PROVS,
      payOpts: [{ id: 'mp', label: 'Mercado Pago', sub: 'Tarjetas, dinero en cuenta y más' }, { id: 'card', label: 'Tarjeta de crédito o débito', sub: 'Visa, Mastercard, American Express' }].map(o => ({ ...o, on: c.pay === o.id, ring: c.pay === o.id ? '0 0 0 1px var(--color-accent), 0 0 24px -10px var(--color-accent)' : '0 0 0 1px var(--color-neutral-800)', dot: c.pay === o.id ? 'inset 0 0 0 4px var(--color-bg)' : 'none', dotBg: c.pay === o.id ? 'var(--color-accent)' : 'transparent', pick: () => this.setCo('pay', o.id) })),
      payMp: c.pay === 'mp', payCard: c.pay === 'card',
      cardShown: padded, cardBrand: brand, cardNameShown: c.cardName.trim() ? c.cardName.toUpperCase() : 'NOMBRE Y APELLIDO', cardExpShown: c.cardExp || 'MM/AA', cardCvcShown: c.cardCvc || '•••',
      cardRot: s.cardFlip ? 'rotateY(180deg)' : 'rotateY(0deg)', flipOn: () => this.setState({ cardFlip: true }), flipOff: () => this.setState({ cardFlip: false }),
      cuotasOpts: [{ v: '1', label: '1 pago de ' + this.money(total) }, { v: '3', label: '3 cuotas sin interés de ' + this.money(total / 3) }],
      sumLines: cartLines, sumSubtotal: this.money(subtotal), sumShip: shipKnown ? (ship.cost ? this.money(ship.cost) : 'Gratis') : 'Se calcula en el paso 2', sumShipLabel: shipKnown ? ship.label : 'Envío', sumTotal: this.money(total), sumHasSavings: savings > 0, sumSavings: '−' + this.money(savings),
      order: s.order || {}, orderLines: s.order ? s.order.lines : [], orderTotal: s.order ? this.money(s.order.total) : '', orderShip: s.order ? s.order.shipLabel + ' · ' + (s.order.shipCost ? this.money(s.order.shipCost) : 'Gratis') : '',
      orderAgain: () => { this.setState({ order: null, coStep: 0, co: { ...this.state.co, cardNum: '', cardCvc: '', cardExp: '' } }); this.go('tienda'); },
    });
    // FAQ
    const fc = this.FAQ.find(x => x.id === s.faqCat) || this.FAQ[0];
    Object.assign(out, {
      faqCats: this.FAQ.map(x => ({ id: x.id, label: x.label, n: x.items.length, color: x.id === fc.id ? 'var(--color-accent-200)' : 'var(--color-neutral-300)', bg: x.id === fc.id ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent', border: x.id === fc.id ? 'var(--color-accent)' : 'var(--color-neutral-800)', go: () => this.setState({ faqCat: x.id, faqOpen: 0 }) })),
      faqTitle: fc.label,
      faqItems: fc.items.map((it, i) => { const open = s.faqOpen === i; return { ...it, n: String(i + 1).padStart(2, '0'), rows: open ? '1fr' : '0fr', rot: open ? 'rotate(45deg)' : 'rotate(0deg)', qc: open ? 'var(--color-text)' : 'var(--color-neutral-200)', ao: open ? 1 : 0, toggle: () => this.setState(x => ({ faqOpen: x.faqOpen === i ? -1 : i })) }; }),
    });
    // Contacto
    const ct = s.ct, ce = s.ctErr, ctOn = {}; ['name', 'email', 'order', 'msg'].forEach(k => { ctOn[k] = (e) => { const v = e.target.value; this.setState(x => ({ ct: { ...x.ct, [k]: v }, ctErr: { ...x.ctErr, [k]: '' } })); }; });
    const ctHas = {}, ctBd = {}; ['name', 'email', 'msg'].forEach(k => { ctHas[k] = !!ce[k]; ctBd[k] = ce[k] ? 'oklch(0.72 0.14 25)' : ''; });
    Object.assign(out, {
      ct, ctErr: ce, ctHas, ctBd, ctOn, ctSent: s.ctSent, ctForm: !s.ctSent, ctBusy: s.ctBusy, ctIdle: !s.ctBusy,
      ctReasons: ['Pedido', 'Envío', 'Cambio', 'Arrepentimiento', 'Otro'].map(v => ({ v, on: ct.reason === v, pick: () => this.setState(x => ({ ct: { ...x.ct, reason: v } })) })),
      ctSend: () => {
        const e = {}; if (!ct.name.trim()) e.name = 'Contanos tu nombre'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email.trim())) e.email = 'Ingresá un email válido'; if (ct.msg.trim().length < 10) e.msg = 'Escribí al menos 10 caracteres';
        if (Object.keys(e).length) return this.setState({ ctErr: e });
        this.setState({ ctBusy: true }); setTimeout(() => this.setState({ ctBusy: false, ctSent: true }), 1300);
      },
      ctReset: () => this.setState({ ctSent: false, ct: { name: '', email: '', order: '', reason: 'Pedido', msg: '' } }),
      copied: s.copied, notCopied: !s.copied,
      copyEmail: () => { try { navigator.clipboard.writeText('galpon.mates@gmail.com'); } catch (e) {} this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1800); },
    });
    return out;
  }
}
