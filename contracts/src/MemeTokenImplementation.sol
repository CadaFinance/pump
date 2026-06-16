// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Fixed-supply ERC20 with EIP-2612 permit for one-tx sells on the bonding curve.
contract MemeTokenImplementation {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public creator;
    bool public initialized;

    bytes32 public DOMAIN_SEPARATOR;
    mapping(address => uint256) public nonces;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event MemeTokenInitialized(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply
    );

    error AlreadyInitialized();
    error ZeroAddress();
    error InvalidSupply();
    error InsufficientBalance();
    error InsufficientAllowance();
    error ExpiredDeadline();
    error InvalidSignature();

    function initialize(
        string calldata name_,
        string calldata symbol_,
        address creator_,
        address initialHolder_,
        uint256 totalSupply_
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (creator_ == address(0) || initialHolder_ == address(0)) revert ZeroAddress();
        if (totalSupply_ == 0) revert InvalidSupply();

        initialized = true;
        name = name_;
        symbol = symbol_;
        creator = creator_;
        totalSupply = totalSupply_;
        balanceOf[initialHolder_] = totalSupply_;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name_)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        emit Transfer(address(0), initialHolder_, totalSupply_);
        emit MemeTokenInitialized(address(this), creator_, name_, symbol_, totalSupply_);
    }

    function permit(
        address owner_,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (spender == address(0)) revert ZeroAddress();

        bytes32 structHash = keccak256(
            abi.encode(_PERMIT_TYPEHASH, owner_, spender, value, _useNonce(owner_), deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = _recover(digest, v, r, s);
        if (signer != owner_) revert InvalidSignature();

        _approve(owner_, spender, value);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();

        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, amount);
        return true;
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        allowance[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _useNonce(address owner_) internal returns (uint256 current) {
        current = nonces[owner_];
        nonces[owner_] = current + 1;
    }

    function _recover(bytes32 digest, uint8 v, bytes32 r, bytes32 s) internal pure returns (address signer) {
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignature();
        }
        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
    }
}
