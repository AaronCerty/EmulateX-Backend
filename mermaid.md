sequenceDiagram
    autonumber
    actor User

    User->>Frontend: Deposit
    Frontend->>Smartcontract: Call SC deposit() function
    User->>Frontend: Start copy trading
    Frontend->>Backend: Start copy trading
    Note over Frontend,Backend: Process create copy trading session    
    Backend->>Backend: Create PENDING copy trading session in database
    Backend->>Backend: Check Hyperliquid Spot + Smartcontract balance
    opt Deposit from SC to Hyperliquid 
        Backend->>Smartcontract: Withdraw USDC to user's <br/> fund wallet if not enough
        Backend->>HyperliquidSC: Deposit permit USDC <br/> for user's fund wallet
    end
    loop Check deposited balance 
        Backend->>HyperliquidAPI: Call API check Perp balance
    end
    Backend->>HyperliquidAPI: Transfer balance from Spot to Perp
    Backend->>Backend: Mark copy trading session is RUNNING
    User->>Frontend: Get RUNNING copy trading session
    Note over Frontend,Backend: Done create copy trading session


===


sequenceDiagram
    autonumber
    actor User

    User->>Frontend: Stop copy trade
    Frontend->>Backend: Stop all order copy trade and calculate result 
    User->>Frontend: Request withdraw
    Frontend->>Backend: Create withdraw request for user
    Note over Frontend,Backend: Process withdraw request
    Backend->>Backend: Check Hyperliquid Spot + Smartcontract balance
    opt Withdraw from Hyperliquid to Smartcontract (3-5mins)
        Backend->>HyperliquidAPI: Send withdraw request to HyperliquidAPI
        HyperliquidSC->>Smartcontract: Transfer USDC
        loop
            Backend->>HyperliquidSC: Craw FinalizedWithdrawal event to ensure withdraw done
        end
    end
    Backend->>Smartcontract: Admin call function to withdraw and transfer USDC to user wallet
    Note over Frontend,Backend: Done withdraw request

    
    