import styles from './Gallery.module.css';

export function GalleryMessage({ logoUrl, brand, title, message, children }: {
  logoUrl: string | null;
  brand: string;
  title: string | null;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <main className={styles.message}>
      {logoUrl ? <img src={logoUrl} alt={brand} className={styles.messageLogo} /> : <p className={styles.messageBrand}>{brand}</p>}
      {title && <p className={styles.messageTitle}>{title}</p>}
      <p className={styles.messageText}>{message}</p>
      {children}
    </main>
  );
}
