// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal fixed-supply ERC20 used by the TMA MemeFactory.
/// @dev No external dependencies by design; replace with OpenZeppelin in production if desired.
contract MemeTokenImplementation {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public creator;
    bool public initialized;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

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

        emit Transfer(address(0), initialHolder_, totalSupply_);
        emit MemeTokenInitialized(address(this), creator_, name_, symbol_, totalSupply_);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
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

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
