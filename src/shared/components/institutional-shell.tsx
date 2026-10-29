import Image from "next/image";

export function InstitutionalHeader() {
  return (
    <header className="institutional-header">
      <div className="institutional-ribbon">
        <div className="institutional-container">
          Prefeitura de Pindamonhangaba
          <span>Governo digital · Sistemas institucionais</span>
        </div>
      </div>
      <div className="institutional-container institutional-heading">
        <Image
          src="/brand/prefeitura-pindamonhangaba.svg"
          alt="Prefeitura Municipal de Pindamonhangaba"
          width={300}
          height={126}
          className="institutional-logo"
          priority
          unoptimized
        />
        <div className="institutional-department">
          <strong>Tecnologia a serviço da cidade</strong>
          <span>SETIP · Departamento de Sistemas de Informação</span>
        </div>
      </div>
    </header>
  );
}

export function InstitutionalFooter() {
  return (
    <footer className="institutional-footer">
      <div className="institutional-container">
        <div>
          <strong className="footer-product">
            DSI Panel<span>.</span>
          </strong>
          <p>Ferramentas e informações para a gestão municipal.</p>
        </div>
        <div>
          <strong>Prefeitura de Pindamonhangaba</strong>
          <p>SETIP · Departamento de Sistemas de Informação</p>
          <span>
            Uso restrito · Finalidade administrativa · Acesso auditado
          </span>
        </div>
      </div>
    </footer>
  );
}
