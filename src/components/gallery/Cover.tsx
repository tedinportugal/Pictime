import styles from './Cover.module.css';

export function Cover({ title, subtitle, imageUrl, logoUrl, brand }: { title: string; subtitle: string; imageUrl: string | null; logoUrl: string | null; brand: string }) {
  return (
    <header className={styles.cover}>
      {imageUrl && <img className={styles.image} src={imageUrl} alt="" fetchPriority="high" />}
      <div className={styles.shade} />
      {logoUrl ? <img className={styles.logo} src={logoUrl} alt={brand} /> : <div className={styles.brand}>{brand}</div>}
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <a className={styles.enter} href="#galeria">Ver galeria</a>
      </div>
    </header>
  );
}
