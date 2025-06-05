export default function AppFooter() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-6 mt-auto border-t border-border">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Koperasi Merah Putih Sejahtera. All rights reserved.</p>
        <p className="text-sm">Gampong Uteunkot, Kecamatan Muara Dua, Kota Lhokseumawe, Provinsi Aceh, Indonesia.</p>
      </div>
    </footer>
  );
}
