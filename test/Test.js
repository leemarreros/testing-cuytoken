const truffleAssert = require("truffle-assertions");
require("chai").use(require("chai-as-promised")).should();

let CuyToken = artifacts.require("./cuyToken.sol");

const LOAN_PAID_ERROR = "CLIENTE_HAS_NO_LOAN_TO_PAY";
const LOAN_NOT_PAID_ERROR = "CLIENT_HAS_AN_UNPAID_LOAN";
const LOAN_PAID_CODE = 0;
const LOAN_NOT_PAID_CODE = 1;
let zero_address = "0x0000000000000000000000000000000000000000";

contract("Pausable", (accounts) => {
  let accountOwner, Alice, Bob, Carlos, Damian, Evert;
  accountOwner = accounts[0];
  Alice = accounts[1];
  Bob = accounts[2];

  beforeEach(async () => {
    cuyToken = await CuyToken.deployed();
  });

  it("Funciones 'pause' y 'unpause' son solo llamadas por 'onlyOwner'", async () => {
    await truffleAssert.reverts(
      cuyToken.pause({ from: Alice }),
      "Only an owner account could make this call."
    );

    await truffleAssert.reverts(
      cuyToken.unpause({ from: Bob }),
      "Only an owner account could make this call."
    );
  });

  it("Funciones 'pause' y 'unpause' disparan eventos", async () => {
    let eventTriggered;

    eventTriggered = "PausedEvt";
    let tx1 = await cuyToken.pause({ from: accountOwner });
    expect(tx1.logs[0].event).to.be.eq(eventTriggered);
    expect(tx1.logs[0].args.account).to.be.eq(accountOwner);

    eventTriggered = "UnpausedEvt";
    let tx2 = await cuyToken.unpause({ from: accountOwner });
    expect(tx2.logs[0].event).to.be.eq(eventTriggered);
    expect(tx2.logs[0].args.account).to.be.eq(accountOwner);
  });
});

contract("cuyToken - Deploy, lend, mint and pay", (accounts) => {
  let accountOwner, Alice, Bob, Carlos, Damian, Evert;
  accountOwner = accounts[0];
  Alice = accounts[1];
  Bob = accounts[2];
  Carlos = accounts[3];
  Damian = accounts[4];
  Evert = accounts[5];
  Fucci = accounts[6];
  seventhAccount = accounts[7];
  eighthAccount = accounts[8];
  ninethAccount = accounts[9];
  tenthAccount = accounts[10];
  eleventhAccount = accounts[11];

  let name = "CuyToken";
  let symbol = "CTK";
  let initialBalance = 0;
  let decimals = 18;
  let cuyToken;

  beforeEach(async () => {
    cuyToken = await CuyToken.deployed();
  });

  describe("DESPLEGANDO el contrato: ", async () => {
    it("Recupera nombre del Token ", async () => {
      let name_ = await cuyToken.tokenSummary();
      expect(name_.name).to.be.eq(name);
      name_ = await cuyToken.name();
      expect(name_).to.be.eq(name);
    });

    it("Recupera símbolo del Token ", async () => {
      let symbol_ = await cuyToken.tokenSummary();
      expect(symbol_.symbol).to.be.eq(symbol);
      symbol_ = await cuyToken.symbol();
      expect(symbol_).to.be.eq(symbol);
    });

    it("Recupera # decimales del Token ", async () => {
      let dec = await cuyToken.tokenSummary();
      expect(Number(dec.decimals.toString())).to.be.eq(decimals);
      dec = await cuyToken.decimals();
      expect(Number(dec)).to.be.eq(decimals);
    });

    it("Recupera address que publicó el contrato ", async () => {
      let owner = await cuyToken.tokenSummary();
      expect(owner.initialAccount).to.be.eq(accountOwner);
    });

    it("Recupera suministro total al lanzamiento ", async () => {
      let supply = await cuyToken.totalSupply();
      expect(supply.toString()).to.be.eq(String(initialBalance));
    });
  });

  describe("MINADO, PRÉSTAMO y PAGO DE PRÉSTAMO ", () => {
    // Datos del que recibirá el préstamo (loan)
    let account = Alice;
    let idClient = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
    let idBusiness = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
    let amountCuy = 30000;
    let amountFiat = 10000;
    let interest = 100;

    it("Función 'lend': solo es llamado por un 'onlyAdmin'. Muestra apropiado mensaje.", async () => {
      await truffleAssert.reverts(
        cuyToken.lend(
          account,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: Bob }
        ),
        "Only an Admin account could make this call."
      );
    });

    it("Función 'lend': solo es llamado cuando 'whenNotPaused' is True.", async () => {
      cuyToken = await CuyToken.deployed();
      await cuyToken.pause({ from: accountOwner });
      await truffleAssert.reverts(
        cuyToken.lend(
          Alice,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        ),
        "Contract is paused and cannot execute any operation."
      );
      await cuyToken.unpause({ from: accountOwner });
      let res = await cuyToken.lend(
        Alice,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );
      expect(!!res).to.be.eq(true);
    });

    it("Función 'lend': cuenta del prestatario no debe ser 0x00...0", async () => {
      try {
        await cuyToken.lend(
          zero_address,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        );
      } catch (error) {
        expect(error.message).to.include("error");
      }
    });

    it("Función 'lend': cuenta del prestatario no debe ser 0x00...0. Muestra mensaje apropiado.", async () => {
      account = zero_address;
      await truffleAssert.reverts(
        cuyToken.lend(
          account,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        ),
        "Address account borrower must not be 0."
      );
    });

    // Tokens minados se dirigen a un 'onlyAdmin'
    it("Function 'lend': Suministro Total se incrementa correctamente ", async () => {
      cuyToken = await CuyToken.deployed();
      account = Damian;
      amountCuy = 123123;
      amountFiat = 10000;
      interest = 100;
      let bsupply = await cuyToken.totalSupply();
      let totalSupply = Number(bsupply) + amountCuy;

      let lendTx = await cuyToken.lend(
        account,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );

      let supply = await cuyToken.totalSupply();
      expect(supply.toString()).to.be.eq(String(totalSupply));
    });

    it("Función 'lend': Eventos 'Transfer' (de f()mint) y 'Lend' (de ()lend) son disparados correctamente", async () => {
      account = seventhAccount;
      amountCuy = 123123;
      amountFiat = 10000;
      interest = 100;

      let lendTx = await cuyToken.lend(
        account,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );

      // Event 'Transfer'
      let evTransferName = "Transfer";
      let evTransfer = [...lendTx.logs].filter(
        (ev) => ev.event == evTransferName
      );

      assert.equal(
        evTransfer[0].event,
        evTransferName,
        "Name event does not match."
      );
      assert.equal(
        evTransfer[0].args._from,
        zero_address,
        "Is not sent from a address(0)."
      );
      assert.equal(
        evTransfer[0].args._to,
        accountOwner,
        "Transfer - Account target ('onlyAdmin') does not match."
      );
      assert.equal(
        evTransfer[0].args._value.toString(),
        amountCuy,
        "Amout of tokens sent does not match"
      );

      // Event 'Lend'
      let evLendName = "Lend";
      let evLend = [...lendTx.logs].filter((ev) => ev.event == evLendName);
      assert.equal(evLend[0].event, evLendName, "Event name does not match.");
      assert.equal(
        evLend[0].args.from,
        account,
        "Account target does not match."
      );
      assert.equal(
        evLend[0].args.value.toString(),
        amountCuy,
        "Amount of tokens sent does not match."
      );
    });

    it("Function 'lend': un prestatario no puede pedir otro préstamo hasta que cancele el que tiene", async () => {
      account = eighthAccount;
      amountCuy = 123123;
      amountFiat = 10000;
      interest = 100;

      await cuyToken.lend(
        account,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );

      let currentSupply = await cuyToken.totalSupply();

      await truffleAssert.reverts(
        cuyToken.lend(
          account,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        ),
        LOAN_NOT_PAID_ERROR
      );

      let afterSupply = await cuyToken.totalSupply();

      assert.equal(
        currentSupply.toString(),
        afterSupply.toString(),
        "Supply should not increase if user is not allowed to get another loan"
      );
    });

    it("Function 'lend': Verifica info del prestatario con 'loanBalance': ", async () => {
      account = Fucci;
      idClient = "FUCCI";
      idBusiness = "FUCCIBIZ";
      amountCuy = 321321;
      amountFiat = 10000;
      interest = 1000 + 100;

      let lendTx = await cuyToken.lend(
        account,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );

      let balance = await cuyToken.loanBalance(account);
      let {
        scc,
        idClient: idClient_,
        idBusiness: idBusiness_,
        amountCuy: amountCuy_,
        amountFiat: amountFiat_,
        interest: interest_,
        interestFiat: interestFiat_,
        balanceFiat: balanceFiat_,
        balanceCuy,
        open,
      } = balance;
      expect(scc).to.be.eq(accountOwner);
      expect(idClient_).to.be.eq(idClient);
      expect(idBusiness_).to.be.eq(idBusiness);
      expect(amountCuy_).to.be.eq(String(amountCuy));
      expect(amountFiat_).to.be.eq(String(amountFiat));
      expect(interest_).to.be.eq(String(interest));
      expect(balanceCuy).to.be.eq(String(amountCuy));
      expect(balanceCuy).to.be.eq(String(amountCuy));
      assert.equal(open, true, "For this account, 'open' is not set to true");
    });
  });
});

contract(
  "cuyToken - Transferencia de TOKEN hacia compradores echo por el sistema",
  (accounts) => {
    let accountOwner, Alice, Bob, Carlos, Damian, Evert;
    accountOwner = accounts[0];
    Alice = accounts[1];
    Bob = accounts[2];
    Carlos = accounts[3];
    Damian = accounts[4];
    Evert = accounts[5];
    Fucci = accounts[6];
    seventhAccount = accounts[7];
    eighthAccount = accounts[8];
    ninethAccount = accounts[9];
    tenthAccount = accounts[10];
    eleventhAccount = accounts[11];

    beforeEach(async () => {
      cuyToken = await CuyToken.deployed();
    });

    describe("Function 'transfer' - tranfiere a poseedores de tokens", () => {
      let account = Alice;
      let idClient = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
      let idBusiness = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
      let amountCuy = 30000;
      let amountFiat = 10000;
      let interest = 100;

      it("No debería ser ejecutado cuando 'cuyToken' está PAUSADO", async () => {
        await cuyToken.pause({ from: accountOwner });

        // Bob es el comprador de tokens
        await truffleAssert.reverts(
          cuyToken.transfer(Bob, 20000, { from: accountOwner }),
          "Contract is paused and cannot execute any operation."
        );

        await cuyToken.unpause({ from: accountOwner });
      });

      it("Cuenta destino no debería ser address(0) - Muestra mensaje apropiado", async () => {
        await truffleAssert.reverts(
          cuyToken.transfer(zero_address, 20000, { from: accountOwner }),
          "Cuenta de destino no debería ser address(0)"
        );
      });

      it("Cuando no hay suficientes fondos, muestra mensaje apropiado", async () => {
        await truffleAssert.reverts(
          cuyToken.transfer(Carlos, 50000, { from: accountOwner }),
          "ILLEGAL_TRANSFER_INSUFFICIENT_FUNDS"
        );
      });

      it("Tranfiere cantidad exacta de tokens a comprador", async () => {
        await cuyToken.lend(
          account, // prestatario - no recibe los tokens. los recibe accountOwner
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        );
        let totalSupplyBefore = await cuyToken.totalSupply();

        let tokensToTransfer = 20000;
        let txTransfer = await cuyToken.transfer(Carlos, tokensToTransfer, {
          from: accountOwner,
        });

        let amountTokenPurchaser = await cuyToken.balanceOf(Carlos);
        let amountTokensSystem = await cuyToken.balanceOf(accountOwner);
        let totalSupply = await cuyToken.totalSupply();

        assert.equal(
          amountTokenPurchaser.toString(),
          String(tokensToTransfer),
          "Cantidad recibida de tokens no concuerda con la transferida"
        );

        assert.equal(
          amountTokensSystem.toString(),
          String(Number(totalSupply.toString()) - tokensToTransfer),
          "El admin no terminó con la catidad correcta de tokens luego de la transferencia"
        );

        assert.equal(
          totalSupplyBefore.toString(),
          totalSupply.toString(),
          "El Suministro Total de tokens no debe variar luego de una transferencia."
        );

        assert.equal(
          txTransfer.logs[0].event,
          "Transfer",
          "Evento 'Transfer' no fue llamado correctamente."
        );
        assert.equal(
          txTransfer.logs[0].args._from,
          accountOwner,
          "Tokens no fueron transferidos desde un 'onlyAdmin'."
        );
        assert.equal(
          txTransfer.logs[0].args._to,
          Carlos,
          "El que recibió los tokens no es el destinatario correcto"
        );
        assert.equal(
          txTransfer.logs[0].args._value.toString(),
          String(tokensToTransfer),
          "Cantidad de tokens transferidas no fue el planteado"
        );
      });
    });
  }
);

contract(
  "cuyToken - Transferencia de TOKEN a compradores CONDICIONADO",
  (accounts) => {
    describe("Function 'transferConditioned': ", () => {
      let accountOwner, Alice, Bob, Carlos, Damian, Evert;
      accountOwner = accounts[0];
      Alice = accounts[1];
      Bob = accounts[2];
      Carlos = accounts[3];
      Damian = accounts[4];
      Evert = accounts[5];
      Fucci = accounts[6];
      seventhAccount = accounts[7];
      eighthAccount = accounts[8];
      ninethAccount = accounts[9];
      tenthAccount = accounts[10];
      eleventhAccount = accounts[11];

      let whitelist = [
        eleventhAccount,
        tenthAccount,
        ninethAccount,
        eighthAccount,
      ];

      before(async () => {
        cuyToken = await CuyToken.deployed();
        let idClient = "ALICE";
        let idBusiness = "ALICEBIZ";
        let amountCuy = 50000;
        let amountFiat = 10000;
        let interest = 1000;

        await cuyToken.lend(
          Alice,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        );

        await cuyToken.transfer(Bob, 20000, { from: accountOwner });
      });

      it("Destinatario no es una cuenta address(0)", async () => {
        let to = zero_address;
        let value = 10000;
        try {
          await cuyToken.transferConditioned(to, value, whitelist, {
            from: accountOwner,
          });
        } catch (error) {
          expect(error.message).to.include("error");
        }
      });

      it("Destinatario no es una cuenta address(0) - Muestra mensaje apropiado", async () => {
        let to = zero_address;
        let value = 10000;

        await truffleAssert.reverts(
          cuyToken.transferConditioned(to, value, whitelist, {
            from: accountOwner,
          }),
          "Only an owner account could make this call."
        );
      });

      it("Balance del caller debe ser suficiente", async () => {
        let to = Carlos;
        let value = 100000;

        try {
          await cuyToken.transferConditioned(to, value, whitelist, {
            from: accountOwner,
          });
        } catch (error) {
          expect(error.message).to.include("error");
        }
      });

      it("Balance del caller debe ser suficiente - Muestra mensaje apropiado", async () => {
        let to = Carlos;
        let value = 100000;

        await truffleAssert.reverts(
          cuyToken.transferConditioned(to, value, whitelist, {
            from: accountOwner,
          }),
          "Not enough balance in caller to make this transaction."
        );
      });

      it("Transferencia es exitosa: balance del destinatario y evento", async () => {
        let to = Carlos;
        let value = 10000;

        let totalSupplyBefore = await cuyToken.totalSupply();
        let amountTokensOwner = await cuyToken.balanceOf(accountOwner);

        let txTransderConditioned = await cuyToken.transferConditioned(
          to,
          value,
          whitelist,
          {
            from: accountOwner,
          }
        );

        let totalSupply = await cuyToken.totalSupply();
        let amtTknConditionedReceived = await cuyToken.balanceOf(Carlos);
        let amtTknConditionedAfterSent = await cuyToken.balanceOf(accountOwner);

        assert.equal(
          totalSupplyBefore.toString(),
          totalSupply.toString(),
          "Suministro total no debería incrementarse."
        );

        assert.equal(
          amtTknConditionedReceived.toString(),
          String(value),
          "Cantidad de tokens enviados no es la misma que los recibidos"
        );

        assert.equal(
          String(
            Number(amountTokensOwner.toString()) -
              Number(amtTknConditionedAfterSent.toString())
          ),
          String(value),
          "Se descuentan del caller la misma cantidad de tokens enviados"
        );

        let balanceConditionTknsInReceiver =
          await cuyToken.balanceConditionedOf(Carlos);

        assert.equal(
          balanceConditionTknsInReceiver.toString(),
          String(value),
          "No se guardó la misma cantidad de tokens condicionados en la cuenta del destinatario"
        );

        for (let address of whitelist) {
          let res = await cuyToken.isWhiteList(address, { from: Carlos });
          assert.equal(
            res.toString(),
            String(value),
            "Dentro del 'whitelist' no se guardo la misma cantidad de tokens que se condicionó"
          );
        }

        assert.equal(
          txTransderConditioned.logs[0].event,
          "Transfer",
          "Evento 'Transfer' no fue llamado correctamente."
        );

        assert.equal(
          txTransderConditioned.logs[0].args._from,
          accountOwner,
          "Tokens no fueron transferidos desde un 'onlyAdmin'."
        );
        assert.equal(
          txTransderConditioned.logs[0].args._to,
          Carlos,
          "El que recibió los tokens no es el destinatario correcto"
        );
        assert.equal(
          txTransderConditioned.logs[0].args._value.toString(),
          String(value),
          "Cantidad de tokens transferidas no fue el planteado"
        );
      });
    });

    describe("Function 'shopPay': ", () => {
      let accountOwner, Alice, Bob, Carlos, Damian, Evert;
      accountOwner = accounts[0];
      Alice = accounts[1];
      Bob = accounts[2];
      Carlos = accounts[3];
      Damian = accounts[4];
      Evert = accounts[5];
      Fucci = accounts[6];
      seventhAccount = accounts[7];
      eighthAccount = accounts[8];
      ninethAccount = accounts[9];
      tenthAccount = accounts[10];
      eleventhAccount = accounts[11];

      let whitelist = [
        eleventhAccount,
        tenthAccount,
        ninethAccount,
        eighthAccount,
      ];

      it("Usuario pagará con tokens en tienda - verifica balance de comprador y tienda", async () => {
        let payingToStore = eleventhAccount;
        let tokensPaying = 10000;

        let conditionalBalancePrev = await cuyToken.balanceConditionedOf(
          Carlos
        );

        for (let white of whitelist) {
          let balance_ = await cuyToken.isWhiteList(white, { from: Carlos });
          assert.equal(
            balance_.toString(),
            String(tokensPaying),
            "Cantidad de tokens permitidos para gastar en una tienda 'whitelist' no es la correcta."
          );
        }

        await cuyToken.shopPay(payingToStore, tokensPaying, { from: Carlos });

        let balanceStore = await cuyToken.balanceOf(payingToStore);
        assert.equal(
          balanceStore.toString(),
          String(tokensPaying),
          "Tokens recibidos por la tienda no son los mismos que fueron pagados."
        );

        let conditionalBalance = await cuyToken.balanceConditionedOf(Carlos);
        assert.equal(
          conditionalBalance.toString(),
          String(Number(conditionalBalancePrev.toString()) - 10000),
          "Tokens condicionados retiradoss no fue el planeado."
        );

        for (let white of whitelist) {
          let balanceOfStoreAfterShop = await cuyToken.balanceOf(white);
          if (white == payingToStore) {
            assert.equal(
              balanceOfStoreAfterShop.toString(),
              String(tokensPaying),
              "El balance de las tiendas luego de efectuarse el pago es correcto."
            );
            continue;
          }
          assert.equal(
            balanceOfStoreAfterShop.toString(),
            String(0),
            "El balance de las tiendas luego de efectuarse el pago es correcto."
          );
        }
      });
    });

    describe("Function 'balancesTransform': ", () => {
      let accountOwner = accounts[0];
      let Ana = accounts[1];
      let Barb = accounts[2];
      eighthAccount = accounts[8];
      ninethAccount = accounts[9];
      tenthAccount = accounts[10];
      eleventhAccount = accounts[11];

      let whitelist = [
        eleventhAccount,
        tenthAccount,
        ninethAccount,
        eighthAccount,
      ];

      before(async () => {
        let name = "CuyToken";
        let symbol = "CTK";
        let initialAccount = accounts[0];
        let initialBalance = 0;
        cuyToken = await CuyToken.new(
          name,
          symbol,
          initialAccount,
          initialBalance
        );

        let idClient = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
        let idBusiness = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
        let amountCuy = 50000;
        let amountFiat = 10000;
        let interest = 100;

        await cuyToken.lend(
          Barb,
          idClient,
          idBusiness,
          amountCuy,
          amountFiat,
          interest,
          { from: accountOwner }
        );
      });

      it("No recibe address(0)", async () => {
        let tokensConditioned = 10000;

        try {
          await cuyToken.transferConditioned(
            zero_address,
            tokensConditioned,
            whitelist,
            {
              from: accountOwner,
            }
          );
        } catch (error) {
          expect(error.message).to.include("error");
        }
      });

      it("No recibe address(0) -  muestra mensaje apropiado", async () => {
        let tokensConditioned = 10000;

        await truffleAssert.reverts(
          cuyToken.transferConditioned(
            zero_address,
            tokensConditioned,
            whitelist,
            {
              from: accountOwner,
            }
          ),
          "Could not be called for an address(0)."
        );

        let conditionedBalance = await cuyToken.balanceConditionedOf(Ana);

        assert.equal(
          conditionedBalance.toString(),
          String(tokensConditioned),
          "Tokens condicionados enviados no son correctos."
        );
      });

      it("Verifica  balance pre y post 'balancesTransform'", async () => {
        let tokens = 20000;
        await cuyToken.transfer(Ana, tokens, { from: accountOwner });

        let tokensConditioned = 10000;
        await cuyToken.transferConditioned(Ana, tokensConditioned, whitelist, {
          from: accountOwner,
        });

        let conditionedBalance = await cuyToken.balanceConditionedOf(Ana);

        assert.equal(
          conditionedBalance.toString(),
          String(tokensConditioned),
          "Cantidad de tokens condicionados enviados no es correcta."
        );

        let balance = await cuyToken.balanceOf(Ana);
        assert.equal(
          balance.toString(),
          String(tokens + tokensConditioned),
          "Cantidad de tokens enviados no es correcta."
        );

        let balanceTotalAnaPrev = await cuyToken.balanceOf(Ana);
        let conditionedBalancePrev = await cuyToken.balanceConditionedOf(Ana);

        await cuyToken.balancesTransform(Ana, tokensConditioned, {
          from: accountOwner,
        });

        let balanceTotalAna = await cuyToken.balanceOf(Ana);
        assert.equal(
          balanceTotalAnaPrev.toString(),
          balanceTotalAna.toString(),
          "Balance total de TOKENS no debería cambiar."
        );

        let conditionedBalance_ = await cuyToken.balanceConditionedOf(Ana);
        assert.equal(
          conditionedBalance_.toString(),
          String(Number(conditionedBalancePrev.toString()) - tokensConditioned),
          "Balance condicionado de tokens no cambió correctamente."
        );
      });
    });
  }
);

contract(
  "cuyToken - Transferencia de TOKEN sistema -> compradores con 'aprove'",
  (accounts) => {
    let accountOwner, Alice, Bob, Carlos, Damian, Evert;
    accountOwner = accounts[0];
    Anastasia = accounts[1];
    Benito = accounts[2];
    Cesar = accounts[3];
    Damian = accounts[4];

    before(async () => {
      let name = "CuyToken";
      let symbol = "CTK";
      let initialAccount = accounts[0];
      let initialBalance = 0;
      cuyToken = await CuyToken.new(
        name,
        symbol,
        initialAccount,
        initialBalance
      );

      let idClient = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
      let idBusiness = String(Math.floor(Math.random() * 10000)); // número de 5 dígitos
      let amountCuy = 50000;
      let amountFiat = 10000;
      let interest = 100;

      await cuyToken.lend(
        Anastasia,
        idClient,
        idBusiness,
        amountCuy,
        amountFiat,
        interest,
        { from: accountOwner }
      );

      await cuyToken.transfer(Benito, 20000, { from: accountOwner });
      await cuyToken.transfer(Cesar, 20000, { from: accountOwner });
    });

    describe("Function 'approve' y 'transferFrom' -", () => {
      it("'spender' no debe ser un cuenta address(0) - muestra mensaje apropiado", async () => {
        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);

        let approveTokens = 12000;

        try {
          await cuyToken.approve(zero_address, approveTokens);
        } catch (error) {
          expect(error.message).to.include("error");
        }
        await truffleAssert.reverts(
          cuyToken.approve(zero_address, approveTokens),
          "'spender' address cannot be address(0)."
        );
      });

      it("Caller approves for a 'spender' - verifica allowance y event 'Approval'", async () => {
        let caller = Benito;
        let spender = Cesar;
        let allowedAmount = 12000;

        let txApawait = await cuyToken.approve(spender, allowedAmount, {
          from: caller,
        });

        let eventTriggered = "Approval";
        expect(txApawait.logs[0].event).to.be.eq(eventTriggered);
        expect(txApawait.logs[0].args._owner).to.be.eq(caller);
        expect(txApawait.logs[0].args._spender).to.be.eq(spender);
        expect(txApawait.logs[0].args._value.toString()).to.be.eq(
          String(allowedAmount)
        );

        let allowance = await cuyToken.allowance(caller, spender);
        assert.equal(
          allowance.toString(),
          String(allowedAmount),
          "Monto de tokens en allowance no son los mismos dado por el dueño"
        );

        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);
      });

      it("'tranferFrom' - 'spender' no es address(0) - muestra mensaje apropiado", async () => {
        let caller = Benito;
        let spender = Cesar;
        let allowedAmount = 12000;

        try {
          await cuyToken.transferFrom(caller, zero_address, allowedAmount, {
            from: spender,
          });
        } catch (error) {
          expect(error.message).to.include("error");
        }

        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);

        await truffleAssert.reverts(
          cuyToken.transferFrom(caller, zero_address, allowedAmount, {
            from: accountOwner,
          }),
          "Address of 'spender' cannot be 0."
        );
      });

      it("'tranferFrom' - 'from' tiene igual o más de lo que se transfiere - muestra mensaje", async () => {
        let caller = Benito;
        let spender = Cesar;
        let allowedAmount = 12000;

        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);

        await truffleAssert.reverts(
          cuyToken.transferFrom(caller, spender, allowedAmount + 10000, {
            from: spender,
          }),
          "ILLEGAL_TRANSFER_INSUFFICIENT_FUNDS"
        );
      });

      it("'tranferFrom' - 'from' no autorizó a un 'spender' para mover tokens - muestra mensaje", async () => {
        let from = Benito;
        let spender = Cesar;
        let other = Damian;
        let allowedAmount = 12000;

        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);

        await truffleAssert.reverts(
          cuyToken.transferFrom(from, spender, allowedAmount + 10000, {
            from: Damian,
          }),
          "Not allowed by 'from' to transfer money to 'spender'."
        );
      });

      it("'tranferFrom' - El autorizado 'spender' transfiere tokens.", async () => {
        let from = Benito;
        let to = Cesar;
        let spender = Cesar;
        let allowedAmount = 12000;

        let balanceBenitoPrev = await cuyToken.balanceOf(Benito);
        let balanceCesarPrev = await cuyToken.balanceOf(Cesar);

        assert.equal(
          balanceBenitoPrev.toString(),
          balanceCesarPrev.toString(),
          "Caller y spender tienen la misma cantidad de TOKENS."
        );

        let txTransferFrom = await cuyToken.transferFrom(
          from,
          to,
          allowedAmount,
          {
            from: spender,
          }
        );

        let balanceBenito = await cuyToken.balanceOf(Benito);
        let balanceCesar = await cuyToken.balanceOf(Cesar);

        assert.equal(
          String(Number(balanceBenito.toString()) + allowedAmount),
          String(Number(balanceCesar.toString()) - allowedAmount),
          "Amout of TOKENS deducted from 'from' is not correct."
        );

        let eventName = "Transfer";

        expect(txTransferFrom.logs[0].event).to.be.eq(eventName);
        expect(txTransferFrom.logs[0].args._from).to.be.eq(from);
        expect(txTransferFrom.logs[0].args._to).to.be.eq(to);
        expect(txTransferFrom.logs[0].args._value.toString()).to.be.eq(
          String(allowedAmount)
        );
      });
    });
  }
);
